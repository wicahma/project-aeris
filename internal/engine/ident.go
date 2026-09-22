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

func QuoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}
