//go:build windows

package winutil

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// OpenInExplorer opens a folder or selects a file in Windows Explorer without flashing a console.
func OpenInExplorer(path string) error {
	clean := filepath.Clean(path)
	st, err := os.Stat(clean)
	if err != nil {
		return err
	}
	var cmd *exec.Cmd
	if st.IsDir() {
		cmd = exec.Command("explorer.exe", clean)
	} else {
		cmd = exec.Command("explorer.exe", "/select,"+clean)
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Start()
}

// OpenInEditor opens a file or folder with the configured editor, falling back to VS Code or Notepad/Shell.
func OpenInEditor(targetPath string, customEditor string) error {
	clean := filepath.Clean(targetPath)
	editor := strings.TrimSpace(customEditor)
	if editor != "" {
		cmd := exec.Command(editor, clean)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		return cmd.Start()
	}

	// Prefer VS Code CLI if available in PATH
	if codePath, err := exec.LookPath("code"); err == nil {
		cmd := exec.Command(codePath, clean)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		return cmd.Start()
	}

	// Fallback to Windows default shell association (e.g. notepad / default markdown editor)
	cmd := exec.Command("cmd")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
		CmdLine:    fmt.Sprintf(`cmd /c start "" "%s"`, clean),
	}
	return cmd.Start()
}

// OpenInBrowser opens a local HTML file in the user's default browser without flashing a console.
func OpenInBrowser(filePath string) error {
	clean := filepath.Clean(filePath)
	if _, err := os.Stat(clean); err != nil {
		return err
	}
	cmd := exec.Command("cmd")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
		CmdLine:    fmt.Sprintf(`cmd /c start "" "%s"`, clean),
	}
	return cmd.Start()
}
