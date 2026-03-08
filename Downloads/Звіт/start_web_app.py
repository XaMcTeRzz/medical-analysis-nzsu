#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для запуску веб-додатку
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    print("🚀 Запуск веб-додатку для обробки медичних звітів...")
    print("=" * 60)
    
    # Перевіряємо наявність файлів
    base_path = Path(r"c:\Users\PC\Downloads\Звіт")
    app_file = base_path / "app.py"
    
    if not app_file.exists():
        print("❌ Помилка: Файл app.py не знайдено")
        return
    
    print("✅ Файл додатку знайдено")
    print()
    
    # Запускаємо Streamlit
    try:
        print("🌐 Запуск веб-сервера...")
        print("Браузер відкриється автоматично")
        print("Для зупинки натисніть Ctrl+C")
        print("=" * 60)
        
        # Запускаємо streamlit
        subprocess.run([sys.executable, "-m", "streamlit", "run", "app.py", "--server.port", "8501"], cwd=base_path)
        
    except KeyboardInterrupt:
        print("\n👋 Додаток зупинено")
    except Exception as e:
        print(f"❌ Помилка запуску: {e}")

if __name__ == "__main__":
    main()
