"""A tiny in-memory stand-in for the Supabase client, for route tests."""

from types import SimpleNamespace

from postgrest.exceptions import APIError


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self._in = None

    def select(self, *_):
        return self

    def in_(self, column, values):
        self._in = (column, set(values))
        return self

    def execute(self):
        if self._in:
            column, values = self._in
            return SimpleNamespace(data=[r for r in self.rows if r[column] in values])
        return SimpleNamespace(data=list(self.rows))


class FakeRpc:
    def __init__(self, db, name, params):
        self.db, self.name, self.params = db, name, params

    def execute(self):
        self.db.rpc_calls.append((self.name, self.params))
        slug = self.params["p_slug"]
        if any(w["slug"] == slug for w in self.db.weddings):
            raise APIError({"message": "duplicate key", "code": "23505", "details": "", "hint": ""})
        row = {"id": f"id-{len(self.db.weddings) + 1}", "slug": slug, "status": "draft"}
        self.db.weddings.append(row)
        return SimpleNamespace(data=row)


class FakeSupabase:
    def __init__(self, taken_slugs=()):
        self.weddings = [{"id": f"seed-{i}", "slug": s, "status": "draft"} for i, s in enumerate(taken_slugs)]
        self.rpc_calls = []

    def table(self, name):
        assert name == "weddings"
        return FakeQuery(self.weddings)

    def rpc(self, name, params):
        return FakeRpc(self, name, params)
