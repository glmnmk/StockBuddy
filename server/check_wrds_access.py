"""
Quick script to check what WRDS schemas/libraries you have access to.
Run with: python3 check_wrds_access.py
"""
import subprocess, sys

# Install wrds if not present
try:
    import wrds
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "wrds", "-q"])
    import wrds

print("Connecting to WRDS...")
db = wrds.Connection(wrds_username="glmnm")

print("\n=== Your available WRDS schemas ===")
schemas = db.list_libraries()
for s in sorted(schemas):
    print(f"  {s}")

# Test a few key schemas
test_tables = {
    "crsp":              "crsp.dsf",
    "comp":              "comp.funda",
    "comp_na_daily_all": "comp_na_daily_all.secd",
    "lseg":              None,
    "tr_ds":             None,  # Datastream
    "wrdsapps":          "wrdsapps.ibcrsphdr",
}

print("\n=== Schema access test ===")
for schema, table in test_tables.items():
    if schema in schemas:
        print(f"  ✅ {schema} — accessible")
        if table:
            try:
                df = db.raw_sql(f"SELECT * FROM {table} LIMIT 1")
                print(f"     └─ {table}: {list(df.columns)}")
            except Exception as e:
                print(f"     └─ {table}: ERROR: {e}")
    else:
        print(f"  ❌ {schema} — no access")
