package main

import (
	"embed"
	"flag"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"

	"skillsman/internal/model"
	"skillsman/internal/service"
	"skillsman/internal/storage"
	"skillsman/internal/winutil"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed assets/tray-light.png
var trayLightIcon []byte

//go:embed assets/tray-dark.png
var trayDarkIcon []byte

//go:embed build/appicon.png
var appIcon []byte

func init() {
	application.RegisterEvent[string]("state:changed")
	application.RegisterEvent[string]("sync:completed")
	application.RegisterEvent[string]("update:available")
}

func mapWailsTheme(theme model.ThemeMode) application.Theme {
	switch theme {
	case model.ThemeDark:
		return application.Dark
	case model.ThemeLight:
		return application.Light
	default:
		return application.SystemDefault
	}
}

func main() {
	startMinimized := flag.Bool("minimized", false, "Start minimized in the Windows system tray")
	flag.Parse()

	store, err := storage.NewStore("")
	if err != nil {
		log.Fatalf("failed to initialize SkillsMan store: %v", err)
	}

	initialState := store.StateSnapshot()
	var forceQuit atomic.Bool
	var closeToTray atomic.Bool
	closeToTray.Store(initialState.Settings.CloseToTray)

	hooks := &service.RuntimeHooks{}
	svc := service.NewSkillsService(store, hooks)

	var mainWindow *application.WebviewWindow
	var app *application.App
	var systray *application.SystemTray
	var trayMu sync.Mutex

	showMainWindow := func() {
		if mainWindow == nil {
			return
		}
		if mainWindow.IsMinimised() {
			mainWindow.Restore()
		}
		mainWindow.Show()
		mainWindow.Focus()
	}

	toggleMainWindow := func() {
		if mainWindow == nil {
			return
		}
		if mainWindow.IsVisible() && !mainWindow.IsMinimised() {
			mainWindow.Hide()
		} else {
			showMainWindow()
		}
	}

	app = application.New(application.Options{
		Name:        "SkillsMan",
		Description: "Lightweight Windows Agent Skills & Workflow Manager",
		Icon:        appIcon,
		Services: []application.Service{
			application.NewService(svc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "io.skillsman.desktop.v1",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				showMainWindow()
			},
		},
	})

	mainWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "SkillsMan",
		Width:            1200,
		Height:           760,
		MinWidth:         940,
		MinHeight:        640,
		Frameless:        true,
		Hidden:           *startMinimized,
		InitialPosition:  application.WindowCentered,
		BackgroundType:   application.BackgroundTypeTranslucent,
		BackgroundColour: application.NewRGBA(0, 0, 0, 0),
		Windows: application.WindowsWindow{
			BackdropType: application.Mica,
			Theme:        mapWailsTheme(initialState.Settings.Theme),
		},
		URL: "/",
	})

	mainWindow.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
		if !forceQuit.Load() && closeToTray.Load() {
			mainWindow.Hide()
			e.Cancel()
		}
	})

	systray = app.SystemTray.New()
	systray.SetIcon(trayLightIcon)
	systray.SetDarkModeIcon(trayDarkIcon)
	systray.SetTooltip("SkillsMan — Agent Skills 管理器")

	var rebuildTrayMenu func()
	rebuildTrayMenu = func() {
		if app == nil || systray == nil {
			return
		}
		trayMu.Lock()
		defer trayMu.Unlock()

		st := store.StateSnapshot()
		isEn := st.Settings.Language == model.LangEnUS
		menu := app.NewMenu()

		lblShow := "打开 / 隐藏 SkillsMan"
		lblQuickWf := "快速切换全局工作流"
		lblNoWf := "暂无工作流"
		lblSync := "立即同步全部"
		lblHealth := "健康检查 (体检)"
		lblUpdate := "检查仓库更新"
		lblDocs := "使用指南与功能文档"
		lblAutoStart := "开机静默自启"
		lblQuit := "退出 SkillsMan"
		if isEn {
			lblShow = "Show / Hide SkillsMan"
			lblQuickWf = "Quick Global Workflows"
			lblNoWf = "No Workflows"
			lblSync = "Sync All Now"
			lblHealth = "Run Health Check"
			lblUpdate = "Check Repo Updates"
			lblDocs = "Guide & Docs"
			lblAutoStart = "Start Minimized on Boot"
			lblQuit = "Quit SkillsMan"
		}

		menu.Add(lblShow).OnClick(func(_ *application.Context) {
			toggleMainWindow()
		})
		menu.AddSeparator()

		wfSub := menu.AddSubmenu(lblQuickWf)
		globalSet := make(map[string]bool, len(st.Global.WorkflowIDs))
		for _, id := range st.Global.WorkflowIDs {
			globalSet[id] = true
		}
		if len(st.Workflows) == 0 {
			wfSub.Add(lblNoWf).SetEnabled(false)
		} else {
			for _, wf := range st.Workflows {
				wfID := wf.ID
				checked := globalSet[wfID]
				wfSub.AddCheckbox(wf.Name, checked).OnClick(func(_ *application.Context) {
					go func() {
						_, _ = svc.ToggleGlobalWorkflow(wfID, !checked)
					}()
				})
			}
		}

		menu.Add(lblSync).OnClick(func(_ *application.Context) {
			go func() {
				_, _ = svc.SyncAll()
			}()
		})

		menu.Add(lblHealth).OnClick(func(_ *application.Context) {
			showMainWindow()
			app.Event.Emit("state:changed", "tray:health")
		})

		menu.Add(lblUpdate).OnClick(func(_ *application.Context) {
			go func() {
				updated, err := svc.CheckAllUpdates()
				if err == nil && len(updated) > 0 {
					app.Event.Emit("update:available", strings.Join(updated, ", "))
				}
			}()
		})

		menu.Add(lblDocs).OnClick(func(_ *application.Context) {
			showMainWindow()
			app.Event.Emit("state:changed", "tray:docs")
		})

		menu.AddSeparator()

		autoEnabled := winutil.IsAutoStartEnabled()
		menu.AddCheckbox(lblAutoStart, autoEnabled).OnClick(func(_ *application.Context) {
			next := !winutil.IsAutoStartEnabled()
			if err := winutil.SetAutoStart(next); err == nil {
				_ = store.Update(func(s *model.AppState) error {
					s.Settings.AutoStart = next
					return nil
				})
				rebuildTrayMenu()
				app.Event.Emit("state:changed", "tray:autostart")
			}
		})

		menu.AddSeparator()
		menu.Add(lblQuit).OnClick(func(_ *application.Context) {
			forceQuit.Store(true)
			app.Quit()
		})

		menu.Update()
		systray.SetMenu(menu)
	}

	hooks.App = app
	hooks.MainWindow = mainWindow
	hooks.RebuildTray = rebuildTrayMenu
	hooks.SetCloseTray = func(v bool) {
		closeToTray.Store(v)
	}
	hooks.ApplyTheme = func(_ model.ThemeMode) {
		// Theme class and accent updates are applied dynamically in the WebView UI
	}

	systray.OnClick(func() {
		toggleMainWindow()
	})
	systray.OnRightClick(func() {
		systray.OpenMenu()
	})

	rebuildTrayMenu()

	// Background low-overhead repository update checker
	go func() {
		lastCheck := time.Now()
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			st := store.StateSnapshot()
			if !st.Settings.AutoCheckUpdates {
				continue
			}
			interval := time.Duration(st.Settings.CheckIntervalMinutes) * time.Minute
			if interval < 15*time.Minute {
				interval = 15 * time.Minute
			}
			if time.Since(lastCheck) < interval {
				continue
			}
			lastCheck = time.Now()
			if updated, err := svc.CheckAllUpdates(); err == nil && len(updated) > 0 {
				app.Event.Emit("update:available", strings.Join(updated, ", "))
			}
		}
	}()

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
