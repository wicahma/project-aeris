package engine

import (
	"strings"
	"testing"
)

func TestCreateTableSpecValidate(t *testing.T) {
	valid := &CreateTableSpec{
		Name: "users",
		Columns: []ColumnDef{
			{Name: "id", Type: "integer", PrimaryKey: true},
			{Name: "email", Type: "TEXT", Unique: true, NotNull: true},
		},
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("valid spec: %v", err)
	}
	if valid.Columns[0].Type != "INTEGER" {
		t.Errorf("type not normalized: %s", valid.Columns[0].Type)
	}
	if !valid.Columns[0].NotNull {
		t.Error("PK should imply NOT NULL")
	}

	cases := []struct {
		name string
		spec CreateTableSpec
		want string
	}{
		{"bad table name", CreateTableSpec{Name: "9x", Columns: []ColumnDef{{Name: "a", Type: "TEXT"}}}, "ERR_TABLE_NAME_INVALID"},
		{"reserved sqlite_", CreateTableSpec{Name: "sqlite_x", Columns: []ColumnDef{{Name: "a", Type: "TEXT"}}}, "ERR_TABLE_NAME_RESERVED"},
		{"reserved _system_ (case-insensitive)", CreateTableSpec{Name: "_System_foo", Columns: []ColumnDef{{Name: "a", Type: "TEXT"}}}, "ERR_TABLE_NAME_RESERVED"},
		{"no columns", CreateTableSpec{Name: "t"}, "ERR_TABLE_COLUMNS_EMPTY"},
		{"bad column", CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "a b", Type: "TEXT"}}}, "ERR_COLUMN_NAME_INVALID"},
		{"dup column", CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "a", Type: "TEXT"}, {Name: "A", Type: "TEXT"}}}, "ERR_DUPLICATE_COLUMN"},
		{"bad type", CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "a", Type: "VARCHAR(50)"}}}, "ERR_TYPE_UNSUPPORTED"},
		{"multiple PK", CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "a", Type: "INTEGER", PrimaryKey: true}, {Name: "b", Type: "INTEGER", PrimaryKey: true}}}, "ERR_PK_MULTIPLE"},
		{"name too long", CreateTableSpec{Name: strings.Repeat("x", 64), Columns: []ColumnDef{{Name: "a", Type: "TEXT"}}}, "ERR_TABLE_NAME_INVALID"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := tc.spec.Validate(); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Errorf("got %v, want %s", err, tc.want)
			}
		})
	}
}

func TestCreateTableSpecDDL(t *testing.T) {
	def := "0"
	spec := &CreateTableSpec{
		Name: "users",
		Columns: []ColumnDef{
			{Name: "id", Type: "INTEGER", PrimaryKey: true},
			{Name: "name", Type: "TEXT", NotNull: true, Default: &def},
			{Name: "email", Type: "TEXT", Unique: true},
		},
	}
	ddl := spec.DDL()
	for _, want := range []string{
		`CREATE TABLE "users"`,
		`"id" INTEGER PRIMARY KEY`,
		`"name" TEXT NOT NULL DEFAULT 0`,
		`"email" TEXT UNIQUE`,
	} {
		if !strings.Contains(ddl, want) {
			t.Errorf("DDL missing %q: %s", want, ddl)
		}
	}
}

func TestDatabaseCreateAndAddColumn(t *testing.T) {
	db, err := Open(t.TempDir(), "sc", true)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer db.Close()

	spec := &CreateTableSpec{Name: "t1", Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}}}
	if err := db.Create(spec); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if err := db.Create(&CreateTableSpec{Name: "T1", Columns: []ColumnDef{{Name: "x", Type: "TEXT"}}}); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NAME_DUPLICATE") {
		t.Errorf("case-insensitive dup: %v", err)
	}

	if err := db.AddColumn(&AddColumnSpec{Table: "t1", Column: ColumnDef{Name: "extra", Type: "TEXT"}}); err != nil {
		t.Fatalf("AddColumn: %v", err)
	}
	if err := db.AddColumn(&AddColumnSpec{Table: "t1", Column: ColumnDef{Name: "extra", Type: "TEXT"}}); err == nil || !strings.Contains(err.Error(), "ERR_DUPLICATE_COLUMN") {
		t.Errorf("dup column: %v", err)
	}
	if err := db.AddColumn(&AddColumnSpec{Table: "nope", Column: ColumnDef{Name: "x", Type: "TEXT"}}); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing table: %v", err)
	}
	if err := db.AddColumn(&AddColumnSpec{Table: "t1", Column: ColumnDef{Name: "pk2", Type: "INTEGER", PrimaryKey: true}}); err == nil || !strings.Contains(err.Error(), "ERR_PK_ON_ADD") {
		t.Errorf("pk on add: %v", err)
	}

	tables, err := db.Schema()
	if err != nil {
		t.Fatal(err)
	}
	var t1 *Table
	for i := range tables {
		if tables[i].Name == "t1" {
			t1 = &tables[i]
		}
	}
	if t1 == nil {
		t.Fatal("t1 not in schema")
	}
	names := []string{}
	for _, c := range t1.Columns {
		names = append(names, c.Name)
	}
	if len(names) != 2 || names[0] != "id" || names[1] != "extra" {
		t.Errorf("columns = %v", names)
	}
}
