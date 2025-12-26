import os
import subprocess
import sys
import shutil

def install_requirements():
    print("Installing requirements...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "fastapi", "uvicorn", "requests", "beautifulsoup4", "lxml"])

def build_exe():
    print("Starting build process...")
    
    # Define the main script and resources
    main_script = "main.py"
    static_folder = "static"
    
    if not os.path.exists(static_folder):
        print(f"Error: '{static_folder}' directory not found. Did you build the frontend?")
        return

    # PyInstaller arguments
    args = [
        "pyinstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",  # No console window (optional, remove for debugging)
        "--name", "DC_Crawler_App",
        "--add-data", f"{static_folder}{os.pathsep}{static_folder}", # Include static files
        main_script
    ]
    
    print(f"Running PyInstaller: {' '.join(args)}")
    subprocess.check_call(args)
    
    print("\nBuild Complete!")
    print(f"Executable can be found in the 'dist' folder.")

if __name__ == "__main__":
    try:
        install_requirements()
        build_exe()
    except Exception as e:
        print(f"An error occurred: {e}")
        input("Press Enter to exit...")
