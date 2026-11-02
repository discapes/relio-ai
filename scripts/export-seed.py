#!/usr/bin/env python3
"""Export the prepared demo workspace without visitor data or session secrets."""
import argparse
import os
from pathlib import Path
import sqlite3
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("destination", type=Path)
args = parser.parse_args()
if args.source.resolve() == args.destination.resolve():
    parser.error("Source and destination must differ.")

source = sqlite3.connect(args.source.resolve().as_uri() + "?mode=ro", uri=True)
source.execute("BEGIN")
workspace = "prepared-baseline"
if not source.execute("SELECT 1 FROM memory_workspaces WHERE id=?", (workspace,)).fetchone():
    raise SystemExit("Prepared baseline is missing.")

fd, temporary = tempfile.mkstemp(dir=args.destination.parent, suffix=".sqlite")
os.close(fd)
try:
    target = sqlite3.connect(temporary)
    schema = source.execute(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL "
        "AND name NOT LIKE 'sqlite_%' ORDER BY type='index'"
    ).fetchall()
    for kind, table, sql in schema:
        if kind != "table":
            continue
        target.execute(sql)
        columns = [r[1] for r in source.execute(f'PRAGMA table_info("{table}")')]
        if table == "memory_workspaces":
            key = "id"
        elif "workspace_id" in columns and table not in ("wf_jobs", "wf_guidance_preparations"):
            key = "workspace_id"
        else:
            continue
        rows = source.execute(f'SELECT * FROM "{table}" WHERE "{key}"=?', (workspace,)).fetchall()
        target.executemany(f'INSERT INTO "{table}" VALUES ({",".join("?" for _ in columns)})', rows)
        print(f"{table}: {len(rows)}")
    for kind, _, sql in schema:
        if kind == "index":
            target.execute(sql)
    target.commit()
    assert target.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    target.close()
    os.replace(temporary, args.destination)
finally:
    source.close()
    if os.path.exists(temporary):
        os.unlink(temporary)
