import pandas as pd
import numpy as np
from pathlib import Path

def analyze_excel_structure():
    """Аналізує структуру Excel файлів"""
    
    # Шляхи до файлів
    base_path = Path(r"c:\Users\PC\Downloads\Звіт")
    full_file = base_path / "Січень повна.xlsx"
    report_file = base_path / "Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx"
    
    print("=== Аналіз файлу 'Січень повна.xlsx' ===")
    try:
        # Читаємо перші кілька рядків для аналізу структури
        df_full = pd.read_excel(full_file, nrows=10)
        print(f"Кількість стовпців: {len(df_full.columns)}")
        print(f"Назви стовпців: {list(df_full.columns)}")
        print("\nПерші рядки:")
        print(df_full.head())
        
        # Перевіряємо наявність ключових стовпців
        required_columns = ['Унікальний код пацієнта', 'Прізвище', 'Ім\'я', 'По батькові', 'Посада']
        found_columns = []
        for col in required_columns:
            for df_col in df_full.columns:
                if col.lower() in str(df_col).lower():
                    found_columns.append((col, df_col))
        
        print(f"\nЗнайдені стовпці:")
        for req, actual in found_columns:
            print(f"- {req} -> {actual}")
            
    except Exception as e:
        print(f"Помилка читання файлу 'Січень повна.xlsx': {e}")
    
    print("\n" + "="*50)
    print("=== Аналіз файлу 'Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx' ===")
    try:
        df_report = pd.read_excel(report_file, nrows=10)
        print(f"Кількість стовпців: {len(df_report.columns)}")
        print(f"Назви стовпців: {list(df_report.columns)}")
        print("\nПерші рядки:")
        print(df_report.head())
        
        # Перевіряємо наявність ключових стовпців
        required_columns = ['Унікальний код пацієнта', 'Прізвище', 'Ім\'я', 'По батькові', 'Посада']
        found_columns = []
        for col in required_columns:
            for df_col in df_report.columns:
                if col.lower() in str(df_col).lower():
                    found_columns.append((col, df_col))
        
        print(f"\nЗнайдені стовпці:")
        for req, actual in found_columns:
            print(f"- {req} -> {actual}")
            
    except Exception as e:
        print(f"Помилка читання файлу 'Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx': {e}")

if __name__ == "__main__":
    analyze_excel_structure()
