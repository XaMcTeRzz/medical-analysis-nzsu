#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Аналіз медичних даних НСЗУ by XaMcTeR
Автор: XaMcTeR
Дата: 08.03.2026
"""

import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
import re
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import io
import base64

class MedicalReportWebProcessor:
    def __init__(self):
        self.base_path = Path(r"c:\Users\PC\Downloads\Звіт")
        self.full_file = self.base_path / "Січень повна.xlsx"
        self.report_file = self.base_path / "Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx"
        
    def load_full_data(self):
        """Завантажує дані з повного файлу"""
        try:
            df = pd.read_excel(self.full_file, header=None)
            
            # Знаходимо рядок з заголовками
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
                return None
            
            # Встановлюємо заголовки
            headers = df.iloc[header_row].tolist()
            df.columns = headers
            df = df.drop(range(header_row + 1)).reset_index(drop=True)
            df = df.dropna(axis=1, how='all')
            
            # Знаходимо стовпці
            patient_id_col = None
            doctor_name_col = None
            doctor_position_col = None
            
            for col in df.columns:
                col_str = str(col).lower()
                if "уникальний код пацієнта" in col_str or "patient" in col_str or "код пацієнта" in col_str:
                    patient_id_col = col
                elif "медичний працівник" in col_str or "виконавець" in col_str:
                    doctor_name_col = col
                elif "посада медичного працівника" in col_str:
                    doctor_position_col = col
            
            if not patient_id_col:
                return None
            
            # Очищуємо дані
            df = df.dropna(subset=[patient_id_col])
            
            # Перейменовуємо стовпці
            rename_dict = {}
            if patient_id_col:
                rename_dict[patient_id_col] = 'patient_id'
            if doctor_name_col:
                rename_dict[doctor_name_col] = 'doctor_name'
            if doctor_position_col:
                rename_dict[doctor_position_col] = 'doctor_position'
            
            df = df.rename(columns=rename_dict)
            return df
            
        except Exception as e:
            st.error(f"Помилка завантаження повного файлу: {e}")
            return None
    
    def load_report_data(self):
        """Завантажує дані з файлу звіту"""
        try:
            df = pd.read_excel(self.report_file, header=None)
            
            # Знаходимо рядок з заголовками
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
                return None
            
            # Встановлюємо заголовки
            headers = df.iloc[header_row].tolist()
            df.columns = headers
            df = df.drop(range(header_row + 1)).reset_index(drop=True)
            df = df.dropna(axis=1, how='all')
            
            # Знаходимо стовпці
            patient_id_col = None
            amount_col = None
            
            for col in df.columns:
                col_str = str(col).lower()
                if "id пацієнта" in col_str or "patient" in col_str:
                    patient_id_col = col
                elif "до сплати" in col_str or "сума" in col_str or "amount" in col_str:
                    amount_col = col
            
            if not patient_id_col:
                return None
            
            # Очищуємо дані
            df = df.dropna(subset=[patient_id_col])
            
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
            
            return df
            
        except Exception as e:
            st.error(f"Помилка завантаження файлу звіту: {e}")
            return None
    
    def get_unique_doctors(self, df_full):
        """Отримує унікальних лікарів"""
        if df_full is None or 'doctor_name' not in df_full.columns:
            return []
        
        doctors_data = df_full['doctor_name'].dropna()
        doctors_dict = {}
        
        for idx, doctor_name in doctors_data.items():
            name_str = str(doctor_name).strip()
            
            if (name_str == '' or name_str == '-' or 
                'лікар' in name_str.lower() and len(name_str.split()) <= 3):
                continue
            
            if len(name_str.split()) >= 2:
                if name_str not in doctors_dict:
                    position = df_full.loc[idx, 'doctor_position'] if 'doctor_position' in df_full.columns else 'Невідомо'
                    doctors_dict[name_str] = {
                        'position': position,
                        'count': 0
                    }
                doctors_dict[name_str]['count'] += 1
        
        return list(doctors_dict.keys())
    
    def process_doctor_data(self, df_full, df_report, doctor_name):
        """Обробляє дані для конкретного лікаря"""
        if df_full is None or df_report is None:
            return None
        
        doctor_data_full = df_full[df_full['doctor_name'] == doctor_name].copy()
        
        if doctor_data_full.empty:
            return None
        
        doctor_patient_ids = set(doctor_data_full['patient_id'].tolist())
        doctor_report_data = df_report[df_report['patient_id'].isin(doctor_patient_ids)].copy()
        
        if doctor_report_data.empty:
            return None
        
        patient_summary = doctor_report_data.groupby('patient_id').agg({
            'amount': 'sum'
        }).reset_index()
        
        total_patients = len(patient_summary)
        total_amount = patient_summary['amount'].sum()
        
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
        """Генерує повний звіт"""
        df_full = self.load_full_data()
        df_report = self.load_report_data()
        
        if df_full is None or df_report is None:
            return None
        
        doctors = self.get_unique_doctors(df_full)
        results = []
        
        for doctor in doctors:
            result = self.process_doctor_data(df_full, df_report, doctor)
            if result:
                results.append(result)
        
        return results

def create_download_link(df, filename):
    """Створює посилання для завантаження Excel файлу"""
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Звіт')
    
    output.seek(0)
    b64 = base64.b64encode(output.read()).decode()
    href = f'<a href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{b64}" download="{filename}">Завантажити Excel файл</a>'
    return href

def main():
    st.set_page_config(
        page_title="Аналіз медичних даних НСЗУ",
        page_icon="🏥",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Custom CSS for 2026 White-Gray Aesthetic
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        html, body, [data-testid="stAppViewContainer"] {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
        }
        
        .stMetric {
            background-color: #ffffff;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border: 1px solid #e2e8f0;
        }
        
        [data-testid="stHeader"] {
            background: rgba(248, 250, 252, 0.8);
            backdrop-filter: blur(8px);
        }
        
        .stButton>button {
            border-radius: 12px;
            font-weight: 600;
            padding: 12px 24px;
            transition: all 0.2s;
        }
        
        [data-testid="stSidebar"] {
            background-color: #ffffff;
            border-right: 1px solid #e2e8f0;
        }
        
        h1, h2, h3 {
            color: #1e293b;
            letter-spacing: -0.025em;
        }
        </style>
    """, unsafe_allow_html=True)
    
    st.title("🏥 Аналіз медичних даних НСЗУ by XaMcTeR")
    st.markdown("---")
    
    # Plotly theme setup
    MODERN_COLORS = ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']
    
    # Ініціалізація процесора
    processor = MedicalReportWebProcessor()
    
    # Перевірка наявності файлів
    files_exist = processor.full_file.exists() and processor.report_file.exists()
    
    if not files_exist:
        st.error("❌ Не знайдено необхідні файли!")
        st.warning("Переконайтеся, що файли знаходяться в папці 'Звіт':")
        st.write("- Січень повна.xlsx")
        st.write("- Звіт_по_включеним_тижням_по_пацієнтам_СІЧЕНЬ.xlsx")
        return
    
    st.success("✅ Всі файли знайдено!")
    
    # Бічна панель
    st.sidebar.header("🔧 Налаштування")
    
    # Кнопка обробки
    if st.sidebar.button("🚀 Обробити дані", type="primary"):
        with st.spinner("Обробка даних... Це може зайняти деякий час"):
            results = processor.generate_report()
            
            if results:
                st.session_state.results = results
                st.success(f"✅ Оброблено {len(results)} лікарів!")
            else:
                st.error("❌ Помилка обробки даних")
    
    # Якщо результати є в сесії
    if 'results' in st.session_state and st.session_state.results:
        results = st.session_state.results
        
        # Вкладки
        tab1, tab2, tab3, tab4 = st.tabs(["📊 Загальний звіт", "📈 Графіки", "👥 Деталі по лікарям", "💾 Завантаження"])
        
        with tab1:
            st.header("📊 Загальна статистика")
            
            # Створення DataFrame для звіту
            summary_data = []
            for result in results:
                summary_data.append({
                    'ПІБ лікаря': result['doctor_name'],
                    'Посада': result['doctor_position'],
                    'Кількість пацієнтів': result['total_patients'],
                    'Сума до сплати (грн)': round(result['total_amount'], 2)
                })
            
            df_summary = pd.DataFrame(summary_data)
            df_summary = df_summary.sort_values('Сума до сплати (грн)', ascending=False)
            
            # Загальна статистика
            total_patients = sum(r['total_patients'] for r in results)
            total_amount = sum(r['total_amount'] for r in results)
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("👥 Всього лікарів", len(results))
            with col2:
                st.metric("🧾 Всього пацієнтів", total_patients)
            with col3:
                st.metric("💰 Загальна сума", f"{total_amount:,.2f} грн")
            with col4:
                avg_amount = total_amount / total_patients if total_patients > 0 else 0
                st.metric("📊 Середня сума", f"{avg_amount:,.2f} грн")
            
            st.markdown("---")
            
            # Таблиця з результатами
            st.subheader("📋 Детальний звіт по лікарях")
            st.dataframe(df_summary, use_container_width=True)
            
            # Пошук
            st.subheader("🔍 Пошук лікаря")
            search_term = st.text_input("Введіть ПІБ лікаря для пошуку:")
            if search_term:
                filtered_df = df_summary[df_summary['ПІБ лікаря'].str.contains(search_term, case=False, na=False)]
                if not filtered_df.empty:
                    st.dataframe(filtered_df, use_container_width=True)
                else:
                    st.warning("Лікарів не знайдено")
        
        with tab2:
            st.header("📈 Візуалізація даних")
            
            # Графік топ-10 лікарів за сумою
            st.subheader("💰 Топ-10 лікарів за сумою")
            top_10_amount = df_summary.head(10)
            
            fig_amount = px.bar(
                top_10_amount, 
                x='Сума до сплати (грн)', 
                y='ПІБ лікаря',
                orientation='h',
                title='Топ-10 лікарів за сумою до сплати',
                color='Сума до сплати (грн)',
                color_continuous_scale='Greys'
            )
            fig_amount.update_layout(
                height=500,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font_family='Inter'
            )
            st.plotly_chart(fig_amount, use_container_width=True)
            
            # Графік топ-10 лікарів за кількістю пацієнтів
            st.subheader("👥 Топ-10 лікарів за кількістю пацієнтів")
            top_10_patients = df_summary.sort_values('Кількість пацієнтів', ascending=False).head(10)
            
            fig_patients = px.bar(
                top_10_patients, 
                x='Кількість пацієнтів', 
                y='ПІБ лікаря',
                orientation='h',
                title='Топ-10 лікарів за кількістю пацієнтів',
                color='Кількість пацієнтів',
                color_continuous_scale='Greys'
            )
            fig_patients.update_layout(
                height=500,
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font_family='Inter'
            )
            st.plotly_chart(fig_patients, use_container_width=True)
            
            # Кругова діаграма розподілу сум
            st.subheader("🥧 Розподіл сум по лікарях (Топ-10)")
            fig_pie = px.pie(
                top_10_amount,
                values='Сума до сплати (грн)',
                names='ПІБ лікаря',
                title='Розподіл сум по лікарях',
                color_discrete_sequence=MODERN_COLORS
            )
            fig_pie.update_layout(font_family='Inter')
            st.plotly_chart(fig_pie, use_container_width=True)
            
            # Scatter plot залежності суми від кількості пацієнтів
            st.subheader("📊 Залежність суми від кількості пацієнтів")
            fig_scatter = px.scatter(
                df_summary,
                x='Кількість пацієнтів',
                y='Сума до сплати (грн)',
                hover_data=['ПІБ лікаря', 'Посада'],
                title='Залежність суми від кількості пацієнтів',
                size='Сума до сплати (грн)',
                color_discrete_sequence=MODERN_COLORS
            )
            fig_scatter.update_layout(
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font_family='Inter'
            )
            st.plotly_chart(fig_scatter, use_container_width=True)
        
        with tab3:
            st.header("👥 Деталі по лікарях")
            
            # Вибір лікаря
            doctor_names = [r['doctor_name'] for r in results]
            selected_doctor = st.selectbox("Оберіть лікаря:", doctor_names)
            
            if selected_doctor:
                # Знаходимо результат для обраного лікаря
                doctor_result = next(r for r in results if r['doctor_name'] == selected_doctor)
                
                # Інформація про лікаря
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("👥 Кількість пацієнтів", doctor_result['total_patients'])
                with col2:
                    st.metric("💰 Загальна сума", f"{doctor_result['total_amount']:,.2f} грн")
                with col3:
                    avg_pat = doctor_result['total_amount'] / doctor_result['total_patients']
                    st.metric("📊 Середня сума", f"{avg_pat:,.2f} грн")
                
                st.subheader(f"📋 Пацієнти лікаря: {selected_doctor}")
                
                # Деталі пацієнтів
                patient_details = doctor_result['patient_details'].copy()
                patient_details.columns = ['ID пацієнта', 'Сума до сплати']
                patient_details = patient_details.sort_values('Сума до сплати', ascending=False)
                
                st.dataframe(patient_details, use_container_width=True)
                
                # Графік розподілу сум пацієнтів
                st.subheader("📈 Розподіл сум пацієнтів")
                
                if len(patient_details) > 20:
                    # Показуємо топ-20 пацієнтів
                    top_patients = patient_details.head(20)
                    fig_patient_amount = px.bar(
                        top_patients,
                        x='Сума до сплати',
                        y='ID пацієнта',
                        orientation='h',
                        title=f'Топ-20 пацієнтів за сумою ({selected_doctor})',
                        color_discrete_sequence=['#334155']
                    )
                else:
                    fig_patient_amount = px.bar(
                        patient_details,
                        x='Сума до сплати',
                        y='ID пацієнта',
                        orientation='h',
                        title=f'Розподіл сум пацієнтів ({selected_doctor})',
                        color_discrete_sequence=['#334155']
                    )
                
                fig_patient_amount.update_layout(
                    height=max(400, len(patient_details) * 20),
                    paper_bgcolor='rgba(0,0,0,0)',
                    plot_bgcolor='rgba(0,0,0,0)',
                    font_family='Inter'
                )
                st.plotly_chart(fig_patient_amount, use_container_width=True)
        
        with tab4:
            st.header("💾 Завантаження результатів")
            
            # Створення DataFrame для завантаження
            summary_data = []
            for result in results:
                summary_data.append({
                    'ПІБ лікаря': result['doctor_name'],
                    'Посада': result['doctor_position'],
                    'Кількість пацієнтів': result['total_patients'],
                    'Сума до сплати (грн)': round(result['total_amount'], 2)
                })
            
            df_download = pd.DataFrame(summary_data)
            df_download = df_download.sort_values('Сума до сплати (грн)', ascending=False)
            
            # Завантаження Excel
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"Звіт_по_лікарях_{timestamp}.xlsx"
            
            st.subheader("📥 Завантаження повного звіту")
            st.write("Натисніть на кнопку нижче для завантаження Excel файлу з повним звітом:")
            st.markdown(create_download_link(df_download, filename), unsafe_allow_html=True)
            
            # Статистика для завантаження
            st.subheader("📊 Статистичні дані")
            
            # Створення статистичної таблиці
            stats_data = {
                'Показник': [
                    'Всього лікарів',
                    'Всього пацієнтів',
                    'Загальна сума (грн)',
                    'Середня сума на пацієнта (грн)',
                    'Максимальна сума (грн)',
                    'Мінімальна сума (грн)',
                    'Середня кількість пацієнтів на лікаря'
                ],
                'Значення': [
                    len(results),
                    sum(r['total_patients'] for r in results),
                    f"{sum(r['total_amount'] for r in results):,.2f}",
                    f"{sum(r['total_amount'] for r in results) / sum(r['total_patients'] for r in results):,.2f}",
                    f"{max(r['total_amount'] for r in results):,.2f}",
                    f"{min(r['total_amount'] for r in results):,.2f}",
                    f"{sum(r['total_patients'] for r in results) / len(results):,.1f}"
                ]
            }
            
            df_stats = pd.DataFrame(stats_data)
            st.dataframe(df_stats, use_container_width=True)
    

if __name__ == "__main__":
    main()
