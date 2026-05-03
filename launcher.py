import subprocess
import time
import os
import sys
import shutil
import webview
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk
from datetime import datetime
import threading
import http.server
import socketserver

# --- PATH CONFIGURATION ---
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

REACT_DIR = os.path.join(BASE_DIR, "desktop-app", "dist")
BACKUP_DIR = os.path.join(BASE_DIR, "Database_Backups")

def show_splash_screen():
    root = tk.Tk()
    root.overrideredirect(True) 
    root.attributes("-topmost", True) 
    root.configure(bg="white")
    try:
        img_path = os.path.join(BASE_DIR, "logo.png")
        img = Image.open(img_path)
        splash_img = ImageTk.PhotoImage(img)
        label = tk.Label(root, image=splash_img, bg="white")
        label.pack()
        root.geometry(f"{img.width}x{img.height}+{int((root.winfo_screenwidth()/2) - (img.width/2))}+{int((root.winfo_screenheight()/2) - (img.height/2))}")
    except Exception:
        label = tk.Label(root, text="Faran Nexus ERP Loading...", font=("Arial", 24))
        label.pack(padx=50, pady=50)
    root.update()
    return root

def backup_database():
    # Points to db.sqlite3 in your main folder
    db_path = os.path.join(BASE_DIR, "db.sqlite3")
    if os.path.exists(db_path):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        today_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
        shutil.copy2(db_path, os.path.join(BACKUP_DIR, f"Backup_{today_str}.sqlite3"))

def on_closing():
    root = tk.Tk()
    root.overrideredirect(True)
    root.attributes("-topmost", True)
    root.geometry("350x80+{}+{}".format(int(root.winfo_screenwidth()/2 - 175), int(root.winfo_screenheight()/2 - 40)))
    root.configure(bg="#0f172a")
    tk.Label(root, text="Creating Secure Database Backup...\nPlease wait.", fg="#38bdf8", bg="#0f172a", font=("Arial", 12, "bold")).pack(expand=True)
    root.update()
    backup_database()
    time.sleep(2) 
    root.destroy()

def serve_react():
    # Starts React internally without needing Node or Python installed on the PC
    try:
        os.chdir(REACT_DIR)
        class QuietHandler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, format, *args): pass
        with socketserver.TCPServer(("", 5173), QuietHandler) as httpd:
            httpd.serve_forever()
    except Exception: pass

def main():
    splash = show_splash_screen()
    try:
        if not os.path.exists(REACT_DIR):
            raise Exception(f"Cannot find React folder at:\n{REACT_DIR}")

        threading.Thread(target=serve_react, daemon=True).start()

        # Points to your newly compiled Django Engine
        backend_exe = os.path.join(BASE_DIR, "backend_server", "backend_server.exe")
        if not os.path.exists(backend_exe):
            raise Exception(f"Cannot find Django engine at:\n{backend_exe}")

        # Starts the database engine safely
        django_process = subprocess.Popen(
            [backend_exe, "runserver", "8000", "--noreload"],
            cwd=BASE_DIR,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        
        time.sleep(4)
        splash.destroy()
        
        window = webview.create_window('Faran Nexus ERP', 'http://localhost:5173', width=1280, height=800, min_size=(1024, 768))
        window.events.closing += on_closing
        webview.start()
        
        django_process.terminate()

    except Exception as e:
        splash.destroy()
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Startup Error", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()