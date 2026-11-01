export interface StudentPayment {
  id: number;
  student_id: number;
  fee_head: string;
  amount_paid: number;
  payment_date: string;
  receipt_no: string;
  class_name?: string;
  academic_year?: string;
  collected_by: string;
}

export interface StudentClassHistory {
  id: number;
  student_id: number;
  academic_year: string;
  class_name: string;
  roll_no: number;
  admission_fee_status: string;
  admission_fee_amount: number;
  pending_due_amount: number;
  created_at: string;
}

export interface Student {
  id: number;
  roll_no: number;
  student_name: string;
  father_name: string;
  village: string;
  mobile: string;
  class_name: string;
  academic_year: string;
  status: 'ACTIVE' | 'LEFT';
  previous_class_due: number;
  joined_month: string;
  admission_fee_status: 'PAID' | 'FREE' | 'PENDING';
  admission_fee_amount: number;
  admission_fee_date: string | null;
  payments: StudentPayment[];
  history?: StudentClassHistory[];
}

export interface FeeStructure {
  class_name: string;
  monthly_fee: number;
  exam_fee: number;
  default_admission_fee: number;
}

export interface ReceiptItem {
  fee_head: string;
  labelEn: string;
  labelHi: string;
  amount_paid: number;
}

export interface ReceiptData {
  receipt_no: string;
  payment_date: string;
  student_id: number;
  student_name: string;
  father_name: string;
  village: string;
  mobile: string;
  class_name: string;
  academic_year: string;
  collected_by: string;
  items: ReceiptItem[];
  total_amount: number;
}

export interface ReportSummary {
  total_students: number;
  total_active: number;
  total_left: number;
  today_total: number;
  month_total: number;
  all_total: number;
  recent_payments: Array<StudentPayment & { student: Student }>;
}

export interface DefaulterStudent {
  id: number;
  roll_no: number;
  student_name: string;
  father_name: string;
  village: string;
  mobile: string;
  class_name: string;
  academic_year: string;
  status: 'ACTIVE' | 'LEFT';
  joined_month: string;
  previous_class_due: number;
  current_class_due: number;
  unpaid_heads: Array<{ id: string; labelEn: string; labelHi: string; amount: number }>;
  total_due: number;
  paid_count: number;
  whatsapp_message?: string;
  whatsapp_url?: string;
}

export type UserRole = 'COLLECTOR' | 'ADMIN';
