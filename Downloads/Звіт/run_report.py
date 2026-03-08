#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Програма для обробки медичних звітів
Автор: Cascade AI Assistant
Дата: 08.03.2026

Призначення:
- Читає дані з Excel файлів медичних звітів
- Фільтрує дані по лікарях
- Створює звіти з кількістю пацієнтів та сумами до сплати
"""

import sys
from pathlib import Path
from medical_report_processor_by_doctor import MedicalReportProcessor

def main():
    print("=" * 60)
    print("ПРОГРАМА ДЛЯ ОБРОБКИ МЕДИЧНИХ ЗВІТІВ")
    print("=" * 60)
    print()
    
    # Перевіряємо наявність файлів
    base_path = Path(r"c:\Users\PC\Downloads\Звіт")
    full_file = base_path / "Січень повна.xlsx"
    report_file = base_path / "Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx"
    
    if not full_file.exists():
        print(f"❌ Помилка: Файл '{full_file}' не знайдено")
        print("Будь ласка, переконайтеся, що файл 'Січень повна.xlsx' знаходиться в папці Звіт")
        return
    
    if not report_file.exists():
        print(f"❌ Помилка: Файл '{report_file}' не знайдено")
        print("Будь ласка, переконайтеся, що файл 'Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx' знаходиться в папці Звіт")
        return
    
    print("✅ Всі необхідні файли знайдено")
    print()
    
    # Запускаємо обробку
    try:
        processor = MedicalReportProcessor(base_path)
        processor.generate_report()
        
        print()
        print("=" * 60)
        print("✅ ОБРОБКУ ЗАВЕРШЕНО УСПІШНО!")
        print("=" * 60)
        print()
        print("Результати збережено у файл:")
        print("- Звіт по лікарях з ПІБ та сумами")
        print()
        print("Файли звітів знаходяться в папці 'Звіт'")
        
    except Exception as e:
        print(f"❌ Помилка під час обробки: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
