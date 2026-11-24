//go:build windows

package winutil

import (
	"fmt"

	"golang.org/x/sys/windows/registry"

	"skillsman/internal/model"
)

// GetSystemTheme reads the Windows 11/10 light/dark preference and DWM accent color.
func GetSystemTheme() model.SystemThemeInfo {
	info := model.SystemThemeInfo{
		IsDark:      false,
		AccentColor: "#0078D4",
	}

	if k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`, registry.QUERY_VALUE); err == nil {
		if val, _, err := k.GetIntegerValue("AppsUseLightTheme"); err == nil {
			info.IsDark = val == 0
		}
		k.Close()
	}

	if info.IsDark {
		info.AccentColor = "#60CDFF"
	}

	if k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\DWM`, registry.QUERY_VALUE); err == nil {
		if val, _, err := k.GetIntegerValue("AccentColor"); err == nil {
			// DWM AccentColor DWORD format is 0xAABBGGRR
			r := byte(val & 0xFF)
			g := byte((val >> 8) & 0xFF)
			b := byte((val >> 16) & 0xFF)
			if r != 0 || g != 0 || b != 0 {
				info.AccentColor = fmt.Sprintf("#%02X%02X%02X", r, g, b)
			}
		}
		k.Close()
	}

	return info
}
