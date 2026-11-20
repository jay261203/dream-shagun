from app.config import Settings


def test_local_file_overrides_the_shared_one(tmp_path, monkeypatch):
    """api/.env.local sits on top of api/.env, so the local Supabase can be used without editing the hosted values."""
    (tmp_path / ".env").write_text("SUPABASE_URL=https://hosted.example\nSUPABASE_JWT_SECRET=hosted-secret\n")
    (tmp_path / ".env.local").write_text("SUPABASE_URL=http://127.0.0.1:54321\n")
    monkeypatch.chdir(tmp_path)
    for name in ("SUPABASE_URL", "SUPABASE_JWT_SECRET"):
        monkeypatch.delenv(name, raising=False)

    settings = Settings()
    assert settings.supabase_url == "http://127.0.0.1:54321"  # taken from .env.local
    assert settings.supabase_jwt_secret == "hosted-secret"  # not overridden, still from .env


def test_a_real_environment_variable_beats_both_files(tmp_path, monkeypatch):
    (tmp_path / ".env.local").write_text("SUPABASE_URL=http://127.0.0.1:54321\n")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("SUPABASE_URL", "https://production.example")
    assert Settings().supabase_url == "https://production.example"


def test_works_with_neither_file_present(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    assert Settings().supabase_url == ""
