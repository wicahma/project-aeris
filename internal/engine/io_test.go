package engine

import (
	"context"
	"strings"
	"testing"
)

func setupIO(t *testing.T) *Database {
	t.Helper()
	db, err := Open(t.TempDir(), "io", true)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	err = db.Create(&CreateTableSpec{Name: "users", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "email", Type: "TEXT", Unique: true},
		{Name: "name", Type: "TEXT"},
	}})
	if err != nil {
		t.Fatal(err)
	}
	return db
}

func TestImportCSV_Basic(t *testing.T) {
	db := setupIO(t)
	csv := "id,email,name\n1,a@x,Alice\n2,b@x,Bob\n3,c@x,Carol\n"
	res, err := db.ImportCSV(context.Background(), strings.NewReader(csv), &ImportSpec{
		Table:     "users",
		Columns:   []string{"id", "email", "name"},
		HasHeader: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.ProcessedRows != 3 || res.InsertedRows != 3 || res.FailedRows != 0 {
		t.Errorf("res = %+v", res)
	}
	var n int
	if err := db.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Errorf("rows = %d", n)
	}
}

func TestImportCSV_SkipDuplicates(t *testing.T) {
	db := setupIO(t)
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x','Alice')`)
	csv := "id,email,name\n1,a@x,Dup\n2,b@x,New\n"
	res, err := db.ImportCSV(context.Background(), strings.NewReader(csv), &ImportSpec{
		Table:             "users",
		Columns:           []string{"id", "email", "name"},
		HasHeader:         true,
		DuplicateStrategy: "skip",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.InsertedRows != 1 || res.SkippedRows != 1 || res.FailedRows != 0 {
		t.Errorf("res = %+v", res)
	}
}

func TestImportCSV_Overwrite(t *testing.T) {
	db := setupIO(t)
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x','Alice')`)
	csv := "id,email,name\n1,a@x,Renamed\n2,b@x,New\n"
	res, err := db.ImportCSV(context.Background(), strings.NewReader(csv), &ImportSpec{
		Table:             "users",
		Columns:           []string{"id", "email", "name"},
		HasHeader:         true,
		DuplicateStrategy: "overwrite",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.InsertedRows != 2 {
		t.Errorf("res = %+v", res)
	}
	var name string
	db.db.QueryRow(`SELECT name FROM users WHERE id=1`).Scan(&name)
	if name != "Renamed" {
		t.Errorf("name = %q", name)
	}
}

func TestImportCSV_FailOnDup(t *testing.T) {
	db := setupIO(t)
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x','Alice')`)
	csv := "id,email,name\n1,a@x,Dup\n2,b@x,New\n"
	res, err := db.ImportCSV(context.Background(), strings.NewReader(csv), &ImportSpec{
		Table:             "users",
		Columns:           []string{"id", "email", "name"},
		HasHeader:         true,
		DuplicateStrategy: "fail",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.FailedRows != 1 || res.InsertedRows != 1 {
		t.Errorf("res = %+v", res)
	}
	if len(res.Errors) != 1 {
		t.Errorf("errors = %+v", res.Errors)
	}
}

func TestImportCSV_Errors(t *testing.T) {
	db := setupIO(t)
	cases := []struct {
		name string
		spec *ImportSpec
		data string
		want string
	}{
		{"reserved table", &ImportSpec{Table: "_system_x", Columns: []string{"a"}}, "", "ERR_TABLE_NAME_RESERVED"},
		{"missing table", &ImportSpec{Table: "nope", Columns: []string{"a"}}, "", "ERR_TABLE_NOT_FOUND"},
		{"bad column", &ImportSpec{Table: "users", Columns: []string{"nope"}}, "", "ERR_INVALID_COLUMN"},
		{"no columns", &ImportSpec{Table: "users"}, "", "ERR_INVALID_INPUT"},
		{"bad strategy", &ImportSpec{Table: "users", Columns: []string{"id"}, DuplicateStrategy: "nope"}, "", "ERR_INVALID_STRATEGY"},
		{"empty file", &ImportSpec{Table: "users", Columns: []string{"id"}, HasHeader: true}, "", "ERR_EMPTY_FILE"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := db.ImportCSV(context.Background(), strings.NewReader(tc.data), tc.spec)
			if err == nil {
				t.Fatal("want error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("err = %v, want %q", err, tc.want)
			}
		})
	}
}

func TestExportCSV(t *testing.T) {
	db := setupIO(t)
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x','Alice'),(2,'b@x','Bob')`)
	var sb strings.Builder
	n, err := db.ExportCSV(context.Background(), "users", &sb)
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("n = %d", n)
	}
	out := sb.String()
	if !strings.Contains(out, "id,email,name") || !strings.Contains(out, "1,a@x,Alice") || !strings.Contains(out, "2,b@x,Bob") {
		t.Errorf("out = %q", out)
	}
}

func TestExportJSON(t *testing.T) {
	db := setupIO(t)
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x','Alice')`)
	var sb strings.Builder
	n, err := db.ExportJSON(context.Background(), "users", &sb)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("n = %d", n)
	}
	out := sb.String()
	if !strings.HasPrefix(out, "[{") || !strings.HasSuffix(out, "]") {
		t.Errorf("out = %q", out)
	}
	if !strings.Contains(out, `"email":"a@x"`) {
		t.Errorf("out = %q", out)
	}
}

func TestExportReserved(t *testing.T) {
	db := setupIO(t)
	_, err := db.ExportCSV(context.Background(), "_system_query_history", &strings.Builder{})
	if err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NAME_RESERVED") {
		t.Errorf("err = %v", err)
	}
}
