import pandas as pd
import numpy as np
from pathlib import Path

def detailed_analysis():
    """Детальний аналіз структури Excel файлів"""
    
    base_path = Path(r"c:\Users\PC\Downloads\Звіт")
    full_file = base_path / "Січень повна.xlsx"
    report_file = base_path / "Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx"
    
    print("=== Детальний аналіз файлу 'Січень повна.xlsx' ===")
    try:
        # Читаємо з першого рядка (header=0)
        df_full = pd.read_excel(full_file, header=None)
        print(f"Розмір таблиці: {df_full.shape}")
        
        # Показуємо перші 20 рядків
        print("\nПерші 20 рядків:")
        for i in range(min(20, len(df_full))):
            row_data = []
            for col in range(min(7, len(df_full.columns))):
                val = df_full.iloc[i, col]
                if pd.notna(val):
                    row_data.append(str(val)[:50])  # Обрізаємо довгі значення
                else:
                    row_data.append("NaN")
            print(f"Рядок {i}: {row_data}")
            
        # Шукаємо рядки з лікарями
        print("\nПошук лікарів...")
        for i in range(len(df_full)):
            for col in range(len(df_full.columns)):
                val = df_full.iloc[i, col]
                if pd.notna(val) and isinstance(val, str):
                    if "Мовчан" in val or "Ігор" in val or "Антонович" in val:
                        print(f"Знайдено лікаря в рядку {i}, стовпець {col}: {val}")
                        
    except Exception as e:
        print(f"Помилка читання файлу: {e}")
    
    print("\n" + "="*60)
    print("=== Детальний аналіз файлу 'Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx' ===")
    try:
        df_report = pd.read_excel(report_file, header=None)
        print(f"Розмір таблиці: {df_report.shape}")
        
        # Показуємо перші 20 рядків
        print("\nПерші 20 рядків:")
        for i in range(min(20, len(df_report))):
            row_data = []
            for col in range(min(7, len(df_report.columns))):
                val = df_report.iloc[i, col]
                if pd.notna(val):
                    row_data.append(str(val)[:50])
                else:
                    row_data.append("NaN")
            print(f"Рядок {i}: {row_data}")
            
    except Exception as e:
        print(f"Помилка читання файлу: {e}")

if __name__ == "__main__":
    detailed_analysis()
