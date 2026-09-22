package engine

import (
	"fmt"
	"regexp"
	"strings"
)

var identRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,62}$`)

func ValidateIdent(name string) error {
	if !identRe.MatchString(name) {
		return fmt.Errorf("invalid identifier %q: must match [A-Za-z_][A-Za-z0-9_]*", name)
	}
	return nil
}

func ReservedIdent(name string) bool {
	l := strings.ToLower(name)
	return strings.HasPrefix(l, "_system_") || strings.HasPrefix(l, "sqlite_")
}

func QuoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}
