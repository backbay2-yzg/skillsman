//go:build windows

package winutil

import (
	"fmt"
	"os"
	"path/filepath"

	"golang.org/x/sys/windows/registry"
)

const runRegistryKey = `Software\Microsoft\Windows\CurrentVersion\Run`
const runValueName = "SkillsMan"

// IsAutoStartEnabled checks whether SkillsMan is configured to start automatically on Windows logon.
func IsAutoStartEnabled() bool {
	k, err := registry.OpenKey(registry.CURRENT_USER, runRegistryKey, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()
	val, _, err := k.GetStringValue(runValueName)
	return err == nil && val != ""
}

// SetAutoStart registers or removes the current executable in HKCU\...\Run with --minimized.
func SetAutoStart(enabled bool) error {
	if !enabled {
		k, err := registry.OpenKey(registry.CURRENT_USER, runRegistryKey, registry.SET_VALUE)
		if err != nil {
			return nil
		}
		defer k.Close()
		err = k.DeleteValue(runValueName)
		if err == registry.ErrNotExist {
			return nil
		}
		return err
	}

	exe, err := os.Executable()
	if err != nil {
		return err
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	k, _, err := registry.CreateKey(registry.CURRENT_USER, runRegistryKey, registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer k.Close()
	cmd := fmt.Sprintf(`"%s" --minimized`, filepath.Clean(exe))
	return k.SetStringValue(runValueName, cmd)
}
