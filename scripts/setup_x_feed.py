import os
import sys
import subprocess
from pathlib import Path

def setup():
    root = Path(__file__).parent.parent
    engine_dir = root / "scripts" / "x_feed_engine"
    venv_dir = engine_dir / ".venv"
    
    # Path to python executable inside venv across platforms
    if sys.platform == "win32":
        python_exe = venv_dir / "Scripts" / "python.exe"
    else:
        python_exe = venv_dir / "bin" / "python"
        
    req_file = engine_dir / "requirements.txt"

    print(f"📦 Setting up Python environment at: {venv_dir}")

    # 1. Create venv if missing
    if not venv_dir.exists():
        print("🔨 Creating Python virtual environment (.venv)...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
        print("✅ Virtual environment created.")

    # 2. Check if dependencies are already installed
    try:
        subprocess.run(
            [str(python_exe), "-c", "import playwright, loguru, dotenv; print('Dependencies OK')"],
            check=True,
            capture_output=True,
            text=True
        )
        print("✅ All required Python packages are already installed.")
        return
    except Exception:
        print("🔄 Installing/updating dependencies from requirements.txt...")

    # 3. Clean proxy env vars for local setup to avoid proxy errors if proxy is offline
    env = os.environ.copy()
    for k in list(env.keys()):
        if k.lower() in ("http_proxy", "https_proxy", "all_proxy", "no_proxy"):
            env.pop(k, None)

    try:
        subprocess.run(
            [str(python_exe), "-m", "pip", "install", "-r", str(req_file)],
            env=env,
            check=True
        )
        print("🎉 Python scraper setup complete!")
    except subprocess.CalledProcessError as e:
        print(f"\n⚠️ pip install exited with code {e.returncode}.")
        print("If you are behind a firewall or using a proxy (Clash/v2ray), make sure it is active or run manually:")
        print(f"   {python_exe} -m pip install -r {req_file}")

if __name__ == "__main__":
    setup()
