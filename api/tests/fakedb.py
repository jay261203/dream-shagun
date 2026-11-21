"""A small in-memory stand-in for the Supabase client: tables of dicts with the query calls the routes use."""

import uuid
from types import SimpleNamespace


class Query:
    def __init__(self, rows: list[dict], table: str):
        self._rows, self._table = rows, table
        self._filters: list = []
        self._mode, self._payload = "select", None
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None

    # building the query
    def select(self, *_):
        self._mode = "select"
        return self

    def insert(self, row: dict):
        self._mode, self._payload = "insert", row
        return self

    def update(self, values: dict):
        self._mode, self._payload = "update", values
        return self

    def delete(self):
        self._mode = "delete"
        return self

    def eq(self, column, value):
        self._filters.append(lambda r: str(r.get(column)) == str(value))
        return self

    def in_(self, column, values):
        wanted = {str(v) for v in values}
        self._filters.append(lambda r: str(r.get(column)) in wanted)
        return self

    def order(self, column, desc=False):
        self._order = (column, desc)
        return self

    def limit(self, n):
        self._limit = n
        return self

    # running it
    def execute(self):
        matching = [r for r in self._rows if all(f(r) for f in self._filters)]
        if self._mode == "insert":
            row = {"id": str(uuid.uuid4()), **self._payload}
            self._rows.append(row)
            return SimpleNamespace(data=[dict(row)])
        if self._mode == "update":
            for r in matching:
                r.update(self._payload)
            return SimpleNamespace(data=[dict(r) for r in matching])
        if self._mode == "delete":
            for r in matching:
                self._rows.remove(r)
            return SimpleNamespace(data=[dict(r) for r in matching])
        out = [dict(r) for r in matching]
        if self._order:
            column, desc = self._order
            out.sort(key=lambda r: r.get(column) or 0, reverse=desc)
        return SimpleNamespace(data=out[: self._limit] if self._limit else out)


class FakeDb:
    def __init__(self, **tables: list[dict]):
        self.tables = {name: list(rows) for name, rows in tables.items()}

    def table(self, name: str) -> Query:
        return Query(self.tables.setdefault(name, []), name)
