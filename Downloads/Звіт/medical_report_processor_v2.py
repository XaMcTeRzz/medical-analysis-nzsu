import pandas as pd
import numpy as np
from pathlib import Path
import re
from datetime import datetime

class MedicalReportProcessor:
    def __init__(self, base_path=None):
        if base_path is None:
            self.base_path = Path(r"c:\Users\PC\Downloads\Звіт")
        else:
            self.base_path = Path(base_path)
        
        self.full_file = self.base_path / "Січень повна.xlsx"
        self.report_file = self.base_path / "Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx"
        
    def load_full_data(self):
        """Завантажує дані з повного файлу"""
        try:
            df = pd.read_excel(self.full_file, header=None)
            print(f"Завантажено повний файл: {df.shape}")
            
            # Знаходимо рядок з заголовками (шукаємо рядок з 'Унікальний код пацієнта')
            header_row = None
            for i in range(min(10, len(df))):
                for col in range(len(df.columns)):
                    cell_value = str(df.iloc[i, col])
                    if "Унікальний код пацієнта" in cell_value:
                        header_row = i
                        break
                if header_row is not None:
                    break
            
            if header_row is None:
                print("Не знайдено рядок з заголовками")
                return None
            
            print(f"Знайдено заголовки в рядку: {header_row}")
            
            # Встановлюємо заголовки
            headers = df.iloc[header_row].tolist()
            df.columns = headers
            df = df.drop(range(header_row + 1)).reset_index(drop=True)
            
            print(f"Назви стовпців після встановлення заголовків:")
            for i, col in enumerate(df.columns):
                print(f"  {i}: {col}")
            
            # Видаляємо порожні стовпці
            df = df.dropna(axis=1, how='all')
            
            # Знаходимо стовпці з даними
            patient_id_col = None
            doctor_name_col = None
            doctor_position_col = None
            
            for col in df.columns:
                col_str = str(col).lower()
                if "уникальний код пацієнта" in col_str or "patient" in col_str or "код пацієнта" in col_str:
                    patient_id_col = col
                elif "лікар" in col_str or "медичний працівник" in col_str or any(name in col_str for name in ["ігор", "молчан", "ярослав"]):
                    doctor_name_col = col
                elif "посада" in col_str:
                    if doctor_position_col is None:  # Беремо перший стовпець з посадою
                        doctor_position_col = col
            
            print(f"\nЗнайдені стовпці:")
            print(f"  ID пацієнта: {patient_id_col}")
            print(f"  Ім'я лікаря: {doctor_name_col}")
            print(f"  Посада лікаря: {doctor_position_col}")
            
            # Очищуємо дані
            if patient_id_col:
                df = df.dropna(subset=[patient_id_col])
            else:
                print("Не знайдено стовпець з ID пацієнта")
                return None
            
            # Перейменовуємо стовпці для зручності
            rename_dict = {}
            if patient_id_col:
                rename_dict[patient_id_col] = 'patient_id'
            if doctor_name_col:
                rename_dict[doctor_name_col] = 'doctor_name'
            if doctor_position_col:
                rename_dict[doctor_position_col] = 'doctor_position'
            
            df = df.rename(columns=rename_dict)
            
            print(f"Після очищення: {df.shape}")
            return df
            
        except Exception as e:
            print(f"Помилка завантаження повного файлу: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def load_report_data(self):
        """Завантажує дані з файлу звіту"""
        try:
            df = pd.read_excel(self.report_file, header=None)
            print(f"Завантажено файл звіту: {df.shape}")
            
            # Знаходимо рядок з заголовками (шукаємо рядок з 'ID пацієнта')
            header_row = None
            for i in range(min(10, len(df))):
                for col in range(len(df.columns)):
                    cell_value = str(df.iloc[i, col])
                    if "ID пацієнта" in cell_value:
                        header_row = i
                        break
                if header_row is not None:
                    break
            
            if header_row is None:
                print("Не знайдено рядок з заголовками у файлі звіту")
                return None
            
            print(f"Знайдено заголовки в рядку: {header_row}")
            
            # Встановлюємо заголовки
            headers = df.iloc[header_row].tolist()
            df.columns = headers
            df = df.drop(range(header_row + 1)).reset_index(drop=True)
            
            print(f"Назви стовпців у файлі звіту:")
            for i, col in enumerate(df.columns):
                print(f"  {i}: {col}")
            
            # Видаляємо порожні стовпці
            df = df.dropna(axis=1, how='all')
            
            # Знаходимо стовпці з даними
            patient_id_col = None
            amount_col = None
            
            for col in df.columns:
                col_str = str(col).lower()
                if "id пацієнта" in col_str or "patient" in col_str:
                    patient_id_col = col
                elif "до сплати" in col_str or "сума" in col_str or "amount" in col_str:
                    amount_col = col
            
            print(f"\nЗнайдені стовпці:")
            print(f"  ID пацієнта: {patient_id_col}")
            print(f"  Сума: {amount_col}")
            
            # Очищуємо дані
            if patient_id_col:
                df = df.dropna(subset=[patient_id_col])
            else:
                print("Не знайдено стовпець з ID пацієнта")
                return None
            
            # Перейменовуємо стовпці
            rename_dict = {}
            if patient_id_col:
                rename_dict[patient_id_col] = 'patient_id'
            if amount_col:
                rename_dict[amount_col] = 'amount'
            
            df = df.rename(columns=rename_dict)
            
            # Конвертуємо суму в число
            if 'amount' in df.columns:
                df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
                df = df.dropna(subset=['amount'])
            
            print(f"Після очищення: {df.shape}")
            return df
            
        except Exception as e:
            print(f"Помилка завантаження файлу звіту: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_unique_doctors(self, df_full):
        """Отримує унікальних лікарів з повного файлу"""
        if df_full is None or 'doctor_name' not in df_full.columns:
            return []
        
        doctors = df_full['doctor_name'].dropna().unique()
        doctors = [doc for doc in doctors if str(doc).strip() != '' and str(doc) != 'NaN']
        
        print(f"Знайдено унікальних лікарів: {len(doctors)}")
        for i, doctor in enumerate(doctors[:10]):  # Показуємо перших 10
            print(f"  {i+1}. {doctor}")
        
        return doctors
    
    def process_doctor_data(self, df_full, df_report, doctor_name):
        """Обробляє дані для конкретного лікаря"""
        if df_full is None or df_report is None:
            return None
        
        # Фільтруємо дані лікаря з повного файлу
        doctor_data_full = df_full[df_full['doctor_name'] == doctor_name].copy()
        
        if doctor_data_full.empty:
            print(f"Не знайдено даних для лікаря: {doctor_name}")
            return None
        
        # Отримуємо унікальні ID пацієнтів лікаря
        doctor_patient_ids = set(doctor_data_full['patient_id'].tolist())
        
        # Фільтруємо дані з файлу звіту по цих пацієнтах
        doctor_report_data = df_report[df_report['patient_id'].isin(doctor_patient_ids)].copy()
        
        if doctor_report_data.empty:
            print(f"Не знайдено даних у звіті для лікаря: {doctor_name}")
            return None
        
        # Групуємо по пацієнтах і рахуємо суми
        patient_summary = doctor_report_data.groupby('patient_id').agg({
            'amount': 'sum'
        }).reset_index()
        
        # Загальна статистика
        total_patients = len(patient_summary)
        total_amount = patient_summary['amount'].sum()
        
        # Отримуємо посаду лікаря
        doctor_position = 'Невідомо'
        if 'doctor_position' in doctor_data_full.columns:
            positions = doctor_data_full['doctor_position'].dropna().unique()
            if len(positions) > 0:
                doctor_position = positions[0]
        
        result = {
            'doctor_name': doctor_name,
            'doctor_position': doctor_position,
            'total_patients': total_patients,
            'total_amount': total_amount,
            'patient_details': patient_summary
        }
        
        return result
    
    def generate_report(self):
        """Генерує повний звіт по всіх лікарях"""
        print("=== Початок обробки даних ===")
        
        # Завантажуємо дані
        df_full = self.load_full_data()
        df_report = self.load_report_data()
        
        if df_full is None or df_report is None:
            print("Помилка завантаження даних")
            return
        
        # Отримуємо список лікарів
        doctors = self.get_unique_doctors(df_full)
        
        if not doctors:
            print("Не знайдено лікарів у даних")
            return
        
        # Обробляємо кожного лікаря
        results = []
        
        for i, doctor in enumerate(doctors):
            print(f"\n--- Обробка лікаря {i+1}/{len(doctors)}: {doctor} ---")
            result = self.process_doctor_data(df_full, df_report, doctor)
            
            if result:
                results.append(result)
                print(f"Пацієнтів: {result['total_patients']}, Сума: {result['total_amount']:.2f} грн")
        
        # Створюємо фінальний звіт
        if results:
            self.create_excel_report(results)
        
        print(f"\n=== Обробку завершено. Оброблено {len(results)} лікарів ===")
    
    def create_excel_report(self, results):
        """Створює Excel файл з результатами"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.base_path / f"Звіт_по_лікарях_{timestamp}.xlsx"
        
        # Створюємо DataFrame для звіту
        summary_data = []
        for result in results:
            summary_data.append({
                'ПІБ лікаря': result['doctor_name'],
                'Посада': result['doctor_position'],
                'Кількість пацієнтів': result['total_patients'],
                'Загальна сума до сплати (грн)': round(result['total_amount'], 2)
            })
        
        df_summary = pd.DataFrame(summary_data)
        
        # Сортуємо за сумою по спаданню
        df_summary = df_summary.sort_values('Загальна сума до сплати (грн)', ascending=False)
        
        # Записуємо в Excel з кількома аркушами
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            # Аркуш з загальною статистикою
            df_summary.to_excel(writer, sheet_name='Загальний звіт', index=False)
            
            # Аркуші з детальною інформацією по кожному лікарю
            for result in results:
                # Очищуємо назву аркуша
                sheet_name = re.sub(r'[<>:"/\\|?*]', '_', result['doctor_name'])
                sheet_name = sheet_name[:30]  # Обмежуємо довжину назви
                
                patient_details = result['patient_details'].copy()
                patient_details.columns = ['ID пацієнта', 'Сума до сплати']
                patient_details = patient_details.sort_values('Сума до сплати', ascending=False)
                patient_details.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"Звіт збережено у файл: {output_file}")
        
        # Показуємо загальну статистику
        print(f"\n=== ЗАГАЛЬНА СТАТИСТИКА ===")
        total_patients_all = sum(r['total_patients'] for r in results)
        total_amount_all = sum(r['total_amount'] for r in results)
        print(f"Загальна кількість пацієнтів: {total_patients_all}")
        print(f"Загальна сума: {total_amount_all:.2f} грн")
        
        return output_file

def main():
    """Головна функція"""
    processor = MedicalReportProcessor()
    processor.generate_report()

if __name__ == "__main__":
    main()
