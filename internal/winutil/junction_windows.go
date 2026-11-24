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

// CreateJunction creates a Windows NTFS directory junction without requiring admin privileges.
func CreateJunction(linkPath, targetPath string) error {
	absLink, err := filepath.Abs(linkPath)
	if err != nil {
		return err
	}
	absTarget, err := filepath.Abs(targetPath)
	if err != nil {
		return err
	}
	absLink = filepath.Clean(absLink)
	absTarget = filepath.Clean(absTarget)

	st, err := os.Stat(absTarget)
	if err != nil {
		return fmt.Errorf("target path unavailable: %w", err)
	}
	if !st.IsDir() {
		return fmt.Errorf("target path is not a directory: %s", absTarget)
	}
	if strings.Contains(absLink, `"`) || strings.Contains(absTarget, `"`) {
		return fmt.Errorf("invalid quote character in path")
	}

	if err := os.MkdirAll(filepath.Dir(absLink), 0755); err != nil {
		return err
	}

	cmd := exec.Command("cmd")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
		CmdLine:    fmt.Sprintf(`cmd /c mklink /J "%s" "%s"`, absLink, absTarget),
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("mklink /J failed: %v (%s)", err, strings.TrimSpace(string(out)))
	}

	ok, err := IsJunction(absLink)
	if err != nil || !ok {
		return fmt.Errorf("created path is not a valid junction: %s", absLink)
	}
	return nil
}

// IsJunction reports whether path exists and is a Windows directory reparse point (junction/symlink).
func IsJunction(path string) (bool, error) {
	p16, err := syscall.UTF16PtrFromString(filepath.Clean(path))
	if err != nil {
		return false, err
	}
	attrs, err := syscall.GetFileAttributes(p16)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	const want = syscall.FILE_ATTRIBUTE_REPARSE_POINT | syscall.FILE_ATTRIBUTE_DIRECTORY
	return (attrs & want) == want, nil
}

// ReadJunctionTarget resolves the target path pointed to by a Windows directory junction.
func ReadJunctionTarget(path string) (string, error) {
	target, err := os.Readlink(filepath.Clean(path))
	if err != nil {
		return "", err
	}
	target = strings.TrimPrefix(target, `\??\`)
	target = strings.TrimPrefix(target, `\\?\`)
	return filepath.Clean(target), nil
}

// RemoveJunction safely removes ONLY the junction reparse point without touching target files.
func RemoveJunction(path string) error {
	clean := filepath.Clean(path)
	isJ, err := IsJunction(clean)
	if err != nil {
		return err
	}
	if !isJ {
		return fmt.Errorf("refusing to remove non-junction via RemoveJunction: %s", clean)
	}
	return os.Remove(clean)
}

// PathsEqualFold compares two cleaned Windows paths case-insensitively.
func PathsEqualFold(a, b string) bool {
	return strings.EqualFold(filepath.Clean(a), filepath.Clean(b))
}
