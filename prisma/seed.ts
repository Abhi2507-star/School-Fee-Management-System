import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Swami Vivekanand Sikshan Sansthan data...');

  // 1. Fee structures for Class 1 to Class 8
  const classes = [
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
  ];

  for (const cls of classes) {
    await prisma.feeStructure.upsert({
      where: { class_name: cls },
      update: {},
      create: {
        class_name: cls,
        monthly_fee: 250,
        exam_fee: 250,
        default_admission_fee: 500,
      },
    });
  }

  // 2. Class 6 students from the physical register
  const class6Students = [
    {
      roll_no: 1,
      student_name: 'Janhvi',
      father_name: 'Vikas Kumar',
      village: 'Kammarpur',
      mobile: '8189049338',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'FREE',
      admission_fee_amount: 0,
      admission_fee_date: null,
      payments: [
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-21' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-21' },
        { fee_head: 'QUARTERLY_EXAM', amount_paid: 250, payment_date: '2026-09-21' },
        { fee_head: 'SEPTEMBER', amount_paid: 250, payment_date: '2026-09-21' },
      ],
    },
    {
      roll_no: 2,
      student_name: 'Saumya Vishwakarma',
      father_name: 'Manjeet Vishwakarma',
      village: 'Khalispur Gopalpur',
      mobile: '9318312405',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PENDING',
      admission_fee_amount: 0,
      admission_fee_date: null,
      payments: [
        { fee_head: 'MAY', amount_paid: 250, payment_date: '2026-09-19' },
        { fee_head: 'JUNE', amount_paid: 250, payment_date: '2026-09-19' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-19' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-19' },
        { fee_head: 'QUARTERLY_EXAM', amount_paid: 250, payment_date: '2026-09-19' },
        { fee_head: 'SEPTEMBER', amount_paid: 250, payment_date: '2026-09-19' },
      ],
    },
    {
      roll_no: 3,
      student_name: 'Ritika Singh',
      father_name: 'Vinaypal Singh',
      village: 'Pahadpur Kalan',
      mobile: '9670189540',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 500,
      admission_fee_date: '2026-04-01',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 500, payment_date: '2026-04-01' },
        { fee_head: 'APRIL', amount_paid: 250, payment_date: '2026-04-01' },
        { fee_head: 'MAY', amount_paid: 250, payment_date: '2026-04-01' },
        { fee_head: 'JUNE', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'SEPTEMBER', amount_paid: 250, payment_date: '2026-09-16' },
      ],
    },
    {
      roll_no: 4,
      student_name: 'Palak Yadav',
      father_name: 'Amarnath Yadav',
      village: 'Hinduabad',
      mobile: '9554257593',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 300,
      admission_fee_date: '2026-04-30',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 300, payment_date: '2026-04-30' },
        { fee_head: 'APRIL', amount_paid: 300, payment_date: '2026-04-30' },
        { fee_head: 'MAY', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'JUNE', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-16' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-16' },
      ],
    },
    {
      roll_no: 5,
      student_name: 'Arpita',
      father_name: 'Rajendra',
      village: 'Amremau',
      mobile: '9918123373',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'FREE',
      admission_fee_amount: 0,
      admission_fee_date: null,
      payments: [
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-07-20' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-07-20' },
        { fee_head: 'SEPTEMBER', amount_paid: 250, payment_date: '2026-07-20' },
        { fee_head: 'OCTOBER', amount_paid: 250, payment_date: '2026-07-20' },
      ],
    },
    {
      roll_no: 6,
      student_name: 'Krishika Yadav',
      father_name: 'Amit Yadav',
      village: 'Kammarpur',
      mobile: '7084547893',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 500,
      admission_fee_date: '2026-09-07',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 500, payment_date: '2026-09-07' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-07' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-07' },
      ],
    },
    {
      roll_no: 7,
      student_name: 'Princy Yadav',
      father_name: 'Arun Yadav',
      village: 'Kammarpur',
      mobile: '7084547893',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 400,
      admission_fee_date: '2026-04-10',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 400, payment_date: '2026-04-10' },
      ],
    },
    {
      roll_no: 8,
      student_name: 'Anshi',
      father_name: 'Anil',
      village: 'Tahirpur',
      mobile: '9616454844',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 300,
      admission_fee_date: '2026-04-15',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 300, payment_date: '2026-04-15' },
        { fee_head: 'APRIL', amount_paid: 250, payment_date: '2026-04-15' },
        { fee_head: 'MAY', amount_paid: 250, payment_date: '2026-05-10' },
        { fee_head: 'JUNE', amount_paid: 250, payment_date: '2026-06-12' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-07-15' },
      ],
    },
    {
      roll_no: 9,
      student_name: 'Ishika Tiwari',
      father_name: 'Vinesh Tiwari',
      village: 'Kammarpur',
      mobile: '8874102755',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'FREE',
      admission_fee_amount: 0,
      admission_fee_date: null,
      payments: [
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-09-18' },
        { fee_head: 'AUGUST', amount_paid: 250, payment_date: '2026-09-18' },
      ],
    },
    {
      roll_no: 10,
      student_name: 'Sejal Yadav',
      father_name: 'Sabhajeet Yadav',
      village: 'Hinduabad',
      mobile: '',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 300,
      admission_fee_date: '2026-07-31',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 300, payment_date: '2026-07-31' },
      ],
    },
    {
      roll_no: 11,
      student_name: 'Khushi Gupta',
      father_name: 'Arvind Gupta',
      village: 'Haripur',
      mobile: '8127496336',
      class_name: 'Class 6',
      academic_year: '2026-27',
      admission_fee_status: 'PAID',
      admission_fee_amount: 300,
      admission_fee_date: '2026-04-20',
      payments: [
        { fee_head: 'ADMISSION', amount_paid: 300, payment_date: '2026-04-20' },
        { fee_head: 'APRIL', amount_paid: 250, payment_date: '2026-04-20' },
        { fee_head: 'MAY', amount_paid: 250, payment_date: '2026-05-18' },
        { fee_head: 'JUNE', amount_paid: 250, payment_date: '2026-06-20' },
        { fee_head: 'JULY', amount_paid: 250, payment_date: '2026-07-22' },
      ],
    },
  ];

  let receiptNum = 1;

  for (const s of class6Students) {
    const student = await prisma.student.upsert({
      where: {
        class_name_roll_no_academic_year: {
          class_name: s.class_name,
          roll_no: s.roll_no,
          academic_year: s.academic_year,
        },
      },
      update: {
        student_name: s.student_name,
        father_name: s.father_name,
        village: s.village,
        mobile: s.mobile,
        admission_fee_status: s.admission_fee_status,
        admission_fee_amount: s.admission_fee_amount,
        admission_fee_date: s.admission_fee_date,
      },
      create: {
        roll_no: s.roll_no,
        student_name: s.student_name,
        father_name: s.father_name,
        village: s.village,
        mobile: s.mobile,
        class_name: s.class_name,
        academic_year: s.academic_year,
        admission_fee_status: s.admission_fee_status,
        admission_fee_amount: s.admission_fee_amount,
        admission_fee_date: s.admission_fee_date,
      },
    });

    for (const p of s.payments) {
      const receiptNo = `SVSS-2026-${String(receiptNum++).padStart(3, '0')}`;
      await prisma.feePayment.upsert({
        where: {
          student_id_fee_head: {
            student_id: student.id,
            fee_head: p.fee_head,
          },
        },
        update: {
          amount_paid: p.amount_paid,
          payment_date: p.payment_date,
        },
        create: {
          student_id: student.id,
          fee_head: p.fee_head,
          amount_paid: p.amount_paid,
          payment_date: p.payment_date,
          receipt_no: receiptNo,
          collected_by: 'Fee Collector',
        },
      });
    }
  }

  // Update receipt counter
  await prisma.receiptCounter.upsert({
    where: { year: '2026' },
    update: { last_count: receiptNum },
    create: { year: '2026', last_count: receiptNum },
  });

  console.log(`Successfully seeded ${class6Students.length} students and ${receiptNum - 1} fee payments!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
