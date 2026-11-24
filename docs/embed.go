package docs

import _ "embed"

// IndexHTML holds the prebuilt single-file bilingual offline documentation HTML.
//
//go:embed index.html
var IndexHTML []byte
