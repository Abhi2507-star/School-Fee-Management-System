import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data Definitions
const CLASS_6_STUDENTS = [
  { roll: 1, name: "Janhvi", father: "Vikas Kumar", village: "Kammarpur", mobile: "8189049338", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "JULY", amt: 250, date: "2026-09-21" },
    { head: "AUGUST", amt: 250, date: "2026-09-21" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-21" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-21" }
  ]},
  { roll: 2, name: "Saumya Vishwakarma", father: "Manjeet Vishwakarma", village: "Khalispur Gopalpur", mobile: "9318312405", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "MAY", amt: 250, date: "2026-09-19" },
    { head: "JUNE", amt: 250, date: "2026-09-19" },
    { head: "JULY", amt: 250, date: "2026-09-19" },
    { head: "AUGUST", amt: 250, date: "2026-09-19" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-19" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-19" }
  ]},
  { roll: 3, name: "Ritika Singh", father: "Vinaypal Singh", village: "Pahadpur Kalan", mobile: "9670189540", admStatus: "PAID", admAmt: 500, admDate: "2026-04-01", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-04-01" },
    { head: "APRIL", amt: 250, date: "2026-04-01" },
    { head: "MAY", amt: 250, date: "2026-04-01" },
    { head: "JUNE", amt: 250, date: "2026-09-16" },
    { head: "JULY", amt: 250, date: "2026-09-16" },
    { head: "AUGUST", amt: 250, date: "2026-09-16" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-16" }
  ]},
  { roll: 4, name: "Palak Yadav", father: "Amarnath Yadav", village: "Hinduabad", mobile: "9554257593", admStatus: "PAID", admAmt: 300, admDate: "2026-04-30", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-04-30" },
    { head: "APRIL", amt: 300, date: "2026-04-30" },
    { head: "MAY", amt: 250, date: "2026-09-16" },
    { head: "JUNE", amt: 250, date: "2026-09-16" },
    { head: "JULY", amt: 250, date: "2026-09-16" },
    { head: "AUGUST", amt: 250, date: "2026-09-16" }
  ]},
  { roll: 5, name: "Arpita", father: "Rajendra", village: "Amremau", mobile: "9918123373", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "JULY", amt: 250, date: "2026-07-20" },
    { head: "AUGUST", amt: 250, date: "2026-07-20" },
    { head: "SEPTEMBER", amt: 250, date: "2026-07-20" },
    { head: "OCTOBER", amt: 250, date: "2026-07-20" }
  ]},
  { roll: 6, name: "Krishika Yadav", father: "Amit Yadav", village: "Kammarpur", mobile: "7084547893", admStatus: "PAID", admAmt: 500, admDate: "2026-07-16", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-16" },
    { head: "JULY", amt: 250, date: "2026-09-07" },
    { head: "AUGUST", amt: 250, date: "2026-09-07" }
  ]},
  { roll: 7, name: "Princy Yadav", father: "Arun Yadav", village: "Kammarpur", mobile: "7084547893", admStatus: "PAID", admAmt: 400, admDate: "2026-07-16", payments: [
    { head: "ADMISSION", amt: 400, date: "2026-07-16" }
  ]},
  { roll: 8, name: "Anshi", father: "Anil", village: "Tahirpur", mobile: "9616454844", admStatus: "PAID", admAmt: 300, admDate: "2026-07-01", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-01" },
    { head: "APRIL", amt: 250, date: "2026-07-01" },
    { head: "MAY", amt: 250, date: "2026-07-01" },
    { head: "JUNE", amt: 250, date: "2026-07-01" },
    { head: "JULY", amt: 250, date: "2026-07-01" }
  ]},
  { roll: 9, name: "Ishika Tiwari", father: "Vinesh Tiwari", village: "Kammarpur", mobile: "8874102755", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "JULY", amt: 250, date: "2026-09-18" },
    { head: "AUGUST", amt: 250, date: "2026-09-18" }
  ]},
  { roll: 10, name: "Sejal Yadav", father: "Sabhajeet Yadav", village: "Hinduabad", mobile: "", admStatus: "PAID", admAmt: 300, admDate: "2026-07-31", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-31" }
  ]},
  { roll: 11, name: "Khushi Gupta", father: "Arvind Gupta", village: "Haripur", mobile: "8127496336", admStatus: "PAID", admAmt: 300, admDate: "2026-07-28", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-28" },
    { head: "APRIL", amt: 250, date: "2026-10-29" },
    { head: "MAY", amt: 250, date: "2026-10-29" },
    { head: "JUNE", amt: 250, date: "2026-10-29" },
    { head: "JULY", amt: 250, date: "2026-10-29" }
  ]},
  { roll: 12, name: "Rishika Yadav", father: "Ghanshyam Yadav", village: "Pahadpur", mobile: "9519455127", admStatus: "FREE", admAmt: 0, admDate: null, payments: [] },
  { roll: 13, name: "Saumya Yadav", father: "Jitendra Yadav", village: "Kammarpur", mobile: "9839878399", admStatus: "PAID", admAmt: 300, admDate: "2026-08-21", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-21" },
    { head: "APRIL", amt: 250, date: "2026-10-24" },
    { head: "MAY", amt: 250, date: "2026-10-24" },
    { head: "JUNE", amt: 250, date: "2026-10-24" },
    { head: "JULY", amt: 250, date: "2026-10-24" },
    { head: "AUGUST", amt: 250, date: "2026-10-24" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-24" }
  ]},
  { roll: 14, name: "Vaishnavi Upadhyay", father: "Jitendra Yadav", village: "Haripur", mobile: "6387451363", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-24" }
  ]},
  { roll: 15, name: "Anshika Mishra", father: "Manoj Mishra", village: "Pahadpur", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 16, name: "Pratima Yadav", father: "Ram Pratap Yadav", village: "Kammarpur", mobile: "9918837382", admStatus: "PAID", admAmt: 300, admDate: "2026-07-23", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-23" },
    { head: "APRIL", amt: 250, date: "2026-09-17" },
    { head: "MAY", amt: 250, date: "2026-09-17" },
    { head: "JUNE", amt: 250, date: "2026-09-17" },
    { head: "JULY", amt: 250, date: "2026-09-17" }
  ]},
  { roll: 17, name: "Karan", father: "Tejmani", village: "Ramauli", mobile: "", admStatus: "PAID", admAmt: 300, admDate: "2026-07-19", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-19" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 18, name: "Aniket", father: "Neeraj", village: "Pahadpur", mobile: "9670291569", admStatus: "PAID", admAmt: 300, admDate: "2026-09-14", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-14" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 19, name: "Sandeep Kharwar", father: "Mahendra", village: "Shahpur", mobile: "8176943178", admStatus: "PAID", admAmt: 500, admDate: "2026-09-14", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-09-14" }
  ]},
  { roll: 20, name: "Adarsh", father: "Sohan", village: "Haripur", mobile: "8595043748", admStatus: "PAID", admAmt: 300, admDate: "2026-05-06", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-05-06" },
    { head: "APRIL", amt: 250, date: "2026-09-20" },
    { head: "MAY", amt: 250, date: "2026-09-20" },
    { head: "JUNE", amt: 250, date: "2026-09-20" },
    { head: "JULY", amt: 250, date: "2026-09-20" },
    { head: "AUGUST", amt: 250, date: "2026-09-20" }
  ]},
  { roll: 21, name: "Ansh Yadav", father: "Ashok Kumar", village: "Hinduabad", mobile: "7523800912", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 22, name: "Prateek Chaturvedi", father: "Rakesh Kumar", village: "Kammarpur", mobile: "8097425276", admStatus: "PAID", admAmt: 500, admDate: "2026-07-01", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-01" },
    { head: "JULY", amt: 250, date: "2026-07-01" },
    { head: "AUGUST", amt: 250, date: "2026-07-01" },
    { head: "SEPTEMBER", amt: 250, date: "2026-07-01" },
    { head: "OCTOBER", amt: 250, date: "2026-07-01" }
  ]},
  { roll: 23, name: "Arnav", father: "Murlidhar", village: "Tahirpur", mobile: "8795385807", admStatus: "PAID", admAmt: 500, admDate: "2026-07-07", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-07" },
    { head: "AUGUST", amt: 250, date: "2026-10-18" }
  ]},
  { roll: 24, name: "Krishna Maurya", father: "Rambahadur Maurya", village: "Pahadpur Kalan", mobile: "9161270350", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "JULY", amt: 250, date: "2026-10-14" },
    { head: "AUGUST", amt: 250, date: "2026-10-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-14" },
    { head: "SEPTEMBER", amt: 250, date: "2026-10-14" },
    { head: "OCTOBER", amt: 250, date: "2026-10-14" },
    { head: "NOVEMBER", amt: 250, date: "2026-10-14" },
    { head: "DECEMBER", amt: 250, date: "2026-10-14" }
  ]},
  { roll: 25, name: "Ayush Tiwari", father: "Ambrish Tiwari", village: "Kammarpur", mobile: "8957791183", admStatus: "FREE", admAmt: 0, admDate: null, payments: [] },
  { roll: 26, name: "Ansh Kumar", father: "Avaneesh Kumar", village: "Pratappur", mobile: "950956961", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 27, name: "Mohd Hammad", father: "Shekh Khursheed", village: "Samauli", mobile: "9998176646", admStatus: "PAID", admAmt: 250, admDate: "2026-08-01", payments: [
    { head: "ADMISSION", amt: 250, date: "2026-08-01" }
  ]},
  { roll: 28, name: "Ayush Yadav", father: "Kripashankar", village: "Anantpur", mobile: "9794813220", admStatus: "PAID", admAmt: 300, admDate: "2026-07-14", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-14" }
  ]},
  { roll: 29, name: "Babli Yadav", father: "Ramsingh Yadav", village: "Rasoolpur", mobile: "8604927031", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 30, name: "Aryan Prajapati", father: "Bharat Prajapati", village: "Rampur", mobile: "9628918628", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 31, name: "Mohd Talib", father: "Mohd Unais", village: "Hinduabad", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "SEPTEMBER", amt: 250, date: "2026-09-12" }
  ]},
  { roll: 32, name: "Surabhi Singh", father: "", village: "", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 33, name: "Yash Yadav", father: "", village: "", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 34, name: "Prateek Mishra", father: "", village: "", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 35, name: "Anshu", father: "", village: "", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 36, name: "Khushi Yadav", father: "", village: "", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] }
];

const CLASS_7_STUDENTS = [
  { roll: 1, name: "Shivani", father: "Santosh Kumar Tiwari", village: "Karaundi Kalan", mobile: "8953984520", admStatus: "FREE", admAmt: 0, admDate: null, payments: [] },
  { roll: 2, name: "Khushi Tiwari", father: "Santosh Kumar Tiwari", village: "Karaundi Kalan", mobile: "8953984520", admStatus: "PAID", admAmt: 500, admDate: "2026-05-05", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-05-05" },
    { head: "AUGUST", amt: 250, date: "2026-08-19" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-08-19" },
    { head: "SEPTEMBER", amt: 250, date: "2026-08-19" },
    { head: "OCTOBER", amt: 250, date: "2026-08-19" },
    { head: "NOVEMBER", amt: 250, date: "2026-08-19" }
  ]},
  { roll: 3, name: "Juhi", father: "Anil", village: "Tahirpur", mobile: "9616454844", admStatus: "FREE", admAmt: 0, admDate: null, payments: [] },
  { roll: 4, name: "Arhan", father: "Abdulla Shekh", village: "Samhauli", mobile: "8957716380", admStatus: "PAID", admAmt: 300, admDate: "2026-07-06", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-06" },
    { head: "APRIL", amt: 250, date: "2026-07-06" },
    { head: "MAY", amt: 250, date: "2026-07-06" },
    { head: "JUNE", amt: 250, date: "2026-07-06" },
    { head: "JULY", amt: 250, date: "2026-07-06" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-12" }
  ]},
  { roll: 5, name: "Monika Vishwakarma", father: "Rampravesh Vishwakarma", village: "Khalispur", mobile: "935684681", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 250, date: "2026-08-22" },
    { head: "MAY", amt: 250, date: "2026-08-22" },
    { head: "JUNE", amt: 250, date: "2026-08-22" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-29" }
  ]},
  { roll: 6, name: "Kajal Prajapati", father: "Shobhnath Prajapati", village: "Haripur", mobile: "8429029562", admStatus: "PAID", admAmt: 300, admDate: "2026-07-13", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-13" }
  ]},
  { roll: 7, name: "Khushnuma", father: "Dilshad", village: "Samhauli", mobile: "", admStatus: "FREE", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 200, date: "2026-07-16" },
    { head: "MAY", amt: 200, date: "2026-07-16" },
    { head: "JUNE", amt: 200, date: "2026-07-16" },
    { head: "JULY", amt: 200, date: "2026-07-16" },
    { head: "AUGUST", amt: 200, date: "2026-07-16" },
    { head: "SEPTEMBER", amt: 200, date: "2026-07-16" },
    { head: "OCTOBER", amt: 200, date: "2026-07-16" },
    { head: "NOVEMBER", amt: 200, date: "2026-07-16" },
    { head: "DECEMBER", amt: 200, date: "2026-07-16" }
  ]},
  { roll: 8, name: "Priyanshu", father: "Ganesh Gautam", village: "Haripur", mobile: "7307844008", admStatus: "PAID", admAmt: 500, admDate: "2026-07-16", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-16" },
    { head: "APRIL", amt: 250, date: "2026-07-16" },
    { head: "MAY", amt: 250, date: "2026-07-16" },
    { head: "JUNE", amt: 250, date: "2026-10-27" },
    { head: "JULY", amt: 250, date: "2026-10-27" }
  ]},
  { roll: 9, name: "Sakshi", father: "Bablu", village: "Haripur", mobile: "9648336540", admStatus: "PAID", admAmt: 300, admDate: "2026-07-25", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-25" },
    { head: "APRIL", amt: 250, date: "2026-07-25" },
    { head: "MAY", amt: 250, date: "2026-07-25" },
    { head: "JUNE", amt: 250, date: "2026-07-25" }
  ]},
  { roll: 10, name: "Hina", father: "Naushad", village: "Samhauli", mobile: "6387729710", admStatus: "PAID", admAmt: 250, admDate: "2026-07-25", payments: [
    { head: "ADMISSION", amt: 250, date: "2026-07-25" }
  ]},
  { roll: 11, name: "Saurabh", father: "Lal Bahadur", village: "Gopalpur", mobile: "8736031895", admStatus: "PAID", admAmt: 300, admDate: "2026-07-25", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-25" },
    { head: "APRIL", amt: 250, date: "2026-10-14" },
    { head: "MAY", amt: 250, date: "2026-10-14" },
    { head: "JUNE", amt: 250, date: "2026-10-14" },
    { head: "JULY", amt: 250, date: "2026-10-14" },
    { head: "AUGUST", amt: 250, date: "2026-10-14" }
  ]},
  { roll: 12, name: "Sejal", father: "Sonu Vishwakarma", village: "Khalispur", mobile: "9133806010", admStatus: "PAID", admAmt: 300, admDate: "2026-07-27", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-27" }
  ]},
  { roll: 13, name: "Vipranshu", father: "Santram", village: "Haripur", mobile: "8097134814", admStatus: "PAID", admAmt: 300, admDate: "2026-07-28", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-28" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-05" }
  ]},
  { roll: 14, name: "Saurabh", father: "Rinku", village: "Haripur", mobile: "9118953755", admStatus: "PAID", admAmt: 300, admDate: "2026-07-30", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-30" }
  ]},
  { roll: 15, name: "Mohd Kaif", father: "Mehdi Hasan", village: "Samhauli", mobile: "8000362856", admStatus: "PAID", admAmt: 300, admDate: "2026-07-31", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-31" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 16, name: "Nidhi Pandey", father: "Sunil Kumar Pandey", village: "Sathar", mobile: "6398433821", admStatus: "PAID", admAmt: 300, admDate: "2026-07-31", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-31" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 17, name: "Ayush Yadav", father: "Pramod Yadav", village: "Khalispur", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 250, date: "2026-09-08" },
    { head: "MAY", amt: 250, date: "2026-09-08" },
    { head: "JUNE", amt: 250, date: "2026-09-08" },
    { head: "JULY", amt: 250, date: "2026-09-08" }
  ]},
  { roll: 18, name: "Shrishti Kumari", father: "Lalmani", village: "Haripur", mobile: "9052771990", admStatus: "PAID", admAmt: 300, admDate: "2026-08-05", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-05" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 19, name: "Shrishti", father: "Dinesh", village: "Khalispur", mobile: "8115509917", admStatus: "FREE", admAmt: 0, admDate: null, payments: [] },
  { roll: 20, name: "Anand Kumar", father: "Ramdhari", village: "Haripur", mobile: "9919238665", admStatus: "PAID", admAmt: 300, admDate: "2026-08-07", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-07" },
    { head: "APRIL", amt: 250, date: "2026-09-10" }
  ]},
  { roll: 21, name: "Ruchi", father: "Pankaj Kumar", village: "Samhauli", mobile: "8543901667", admStatus: "PAID", admAmt: 300, admDate: "2026-08-08", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-08" }
  ]},
  { roll: 22, name: "Mohammad Sakib", father: "Mohd Shakeel", village: "Karaundi Kalan", mobile: "7081949878", admStatus: "PAID", admAmt: 300, admDate: "2026-08-12", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-12" },
    { head: "APRIL", amt: 250, date: "2026-10-08" },
    { head: "MAY", amt: 250, date: "2026-10-08" }
  ]},
  { roll: 23, name: "Shani Kumar", father: "Omprakash", village: "Haripur", mobile: "9278101842", admStatus: "PAID", admAmt: 300, admDate: "2026-08-19", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-19" },
    { head: "APRIL", amt: 250, date: "2026-09-21" },
    { head: "MAY", amt: 250, date: "2026-09-21" },
    { head: "JUNE", amt: 250, date: "2026-09-21" },
    { head: "JULY", amt: 250, date: "2026-09-21" },
    { head: "AUGUST", amt: 250, date: "2026-09-21" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-21" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-21" },
    { head: "OCTOBER", amt: 250, date: "2026-09-21" }
  ]},
  { roll: 24, name: "Taj Husain", father: "Mohd Anees", village: "Hinduabad", mobile: "9161079978", admStatus: "PAID", admAmt: 300, admDate: "2026-09-01", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-01" },
    { head: "APRIL", amt: 200, date: "2026-09-01" },
    { head: "MAY", amt: 200, date: "2026-09-01" },
    { head: "JUNE", amt: 200, date: "2026-09-01" },
    { head: "JULY", amt: 200, date: "2026-09-01" },
    { head: "AUGUST", amt: 200, date: "2026-09-01" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-13" },
    { head: "SEPTEMBER", amt: 250, date: "2026-10-13" },
    { head: "OCTOBER", amt: 250, date: "2026-10-13" }
  ]},
  { roll: 25, name: "Pari", father: "Rahul", village: "Karaundi Kalan", mobile: "8423590896", admStatus: "PAID", admAmt: 300, admDate: "2026-05-09", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-05-09" }
  ]},
  { roll: 26, name: "Priyansh Yadav", father: "Vinod Yadav", village: "Khalispur", mobile: "8573090874", admStatus: "PAID", admAmt: 300, admDate: "2026-09-18", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-18" },
    { head: "APRIL", amt: 250, date: "2026-09-18" },
    { head: "MAY", amt: 250, date: "2026-09-18" },
    { head: "JUNE", amt: 250, date: "2026-09-18" },
    { head: "JULY", amt: 250, date: "2026-09-18" },
    { head: "AUGUST", amt: 250, date: "2026-09-18" }
  ]},
  { roll: 27, name: "Suhana Shekh", father: "Abdulla Shekh", village: "Samhauli", mobile: "8957716380", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-12" }
  ]},
  { roll: 28, name: "Sahil Shekh", father: "Abdul Saleem", village: "Samhauli", mobile: "9648819179", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 250, date: "2026-10-22" },
    { head: "MAY", amt: 250, date: "2026-10-22" },
    { head: "JUNE", amt: 250, date: "2026-10-22" },
    { head: "JULY", amt: 250, date: "2026-10-22" },
    { head: "AUGUST", amt: 250, date: "2026-10-22" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-22" },
    { head: "SEPTEMBER", amt: 250, date: "2026-10-22" },
    { head: "OCTOBER", amt: 250, date: "2026-10-22" },
    { head: "NOVEMBER", amt: 250, date: "2026-10-22" },
    { head: "DECEMBER", amt: 250, date: "2026-10-22" },
    { head: "HALF_YEARLY_EXAM", amt: 250, date: "2026-10-22" },
    { head: "JANUARY", amt: 250, date: "2026-10-22" },
    { head: "FEBRUARY", amt: 250, date: "2026-10-22" },
    { head: "MARCH", amt: 250, date: "2026-10-22" },
    { head: "ANNUAL_EXAM", amt: 250, date: "2026-10-22" }
  ]}
];

const CLASS_8_STUDENTS = [
  { roll: 1, name: "Sanskar Sonkar", father: "Ramashankar Sonkar", village: "Karaundi Kalan", mobile: "8956349319", admStatus: "PAID", admAmt: 300, admDate: "2026-04-17", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-04-17" }
  ]},
  { roll: 2, name: "Srishti Shahi", father: "Dileep Kumar", village: "Samhauli", mobile: "9519332944", admStatus: "FREE", admAmt: 0, admDate: "2026-04-29", payments: [] },
  { roll: 3, name: "Pawan Vishwakarma", father: "Rajesh Vishwakarma", village: "Sarsi", mobile: "8732936068", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 4, name: "Prakhar Tiwari", father: "Neeraj Tiwari", village: "Karaundi Kalan", mobile: "9918078187", admStatus: "PAID", admAmt: 300, admDate: "2026-05-11", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-05-11" },
    { head: "APRIL", amt: 250, date: "2026-09-29" },
    { head: "MAY", amt: 250, date: "2026-09-29" },
    { head: "JUNE", amt: 250, date: "2026-09-29" },
    { head: "JULY", amt: 250, date: "2026-09-29" },
    { head: "AUGUST", amt: 250, date: "2026-09-29" }
  ]},
  { roll: 5, name: "Prince Pal", father: "Kamlesh Pal", village: "Haripur", mobile: "8269053551", admStatus: "PAID", admAmt: 500, admDate: "2026-05-16", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-05-16" }
  ]},
  { roll: 6, name: "Amar", father: "Ramprakash", village: "Haripur", mobile: "6389077484", admStatus: "PAID", admAmt: 500, admDate: "2026-06-30", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-06-30" },
    { head: "APRIL", amt: 250, date: "2026-10-15" },
    { head: "MAY", amt: 250, date: "2026-10-15" },
    { head: "JUNE", amt: 250, date: "2026-10-15" },
    { head: "JULY", amt: 250, date: "2026-10-15" },
    { head: "AUGUST", amt: 250, date: "2026-10-15" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-15" },
    { head: "SEPTEMBER", amt: 250, date: "2026-10-15" },
    { head: "OCTOBER", amt: 250, date: "2026-10-15" }
  ]},
  { roll: 7, name: "Vanshika Prajapati", father: "Jagannath Prajapati", village: "Haripur", mobile: "7752922973", admStatus: "PAID", admAmt: 300, admDate: "2026-07-04", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-04" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 8, name: "Varsha Prajapati", father: "Rajkumar", village: "Haripur", mobile: "7752922973", admStatus: "PAID", admAmt: 300, admDate: "2026-07-04", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-04" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 9, name: "Hasreen", father: "Mustaqeem", village: "Tahirpur", mobile: "9967433872", admStatus: "PAID", admAmt: 300, admDate: "2026-07-10", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-10" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 10, name: "Rishi Upadhyay", father: "Sanjay Upadhyay", village: "Bhurahupur", mobile: "9519236328", admStatus: "PAID", admAmt: 500, admDate: "2026-07-14", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-14" },
    { head: "APRIL", amt: 250, date: "2026-09-15" },
    { head: "MAY", amt: 250, date: "2026-09-15" }
  ]},
  { roll: 11, name: "Ayushi Maurya", father: "Bhaktaraj Maurya", village: "Pahadpur Kalan", mobile: "9161463784", admStatus: "PAID", admAmt: 300, admDate: "2026-07-15", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-15" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 12, name: "Shivani", father: "Tejmani", village: "Samhauli", mobile: "7232976047", admStatus: "PAID", admAmt: 300, admDate: "2026-07-15", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-15" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 13, name: "Shreya", father: "Ganesh Gautam", village: "Haripur", mobile: "7307844808", admStatus: "FREE", admAmt: 0, admDate: "2026-07-16", payments: [] },
  { roll: 14, name: "Ankit Kharwar", father: "Sunil Kumar", village: "Haripur", mobile: "9519363350", admStatus: "PAID", admAmt: 300, admDate: "2026-07-17", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-17" },
    { head: "APRIL", amt: 250, date: "2026-09-29" },
    { head: "MAY", amt: 250, date: "2026-09-29" },
    { head: "JUNE", amt: 250, date: "2026-09-29" },
    { head: "JULY", amt: 250, date: "2026-09-29" },
    { head: "AUGUST", amt: 250, date: "2026-09-29" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-29" }
  ]},
  { roll: 15, name: "Lakshmi Yadav", father: "Rajesh Yadav", village: "Gauratikari", mobile: "7880343479", admStatus: "FREE", admAmt: 0, admDate: "2026-07-20", payments: [
    { head: "APRIL", amt: 250, date: "2026-09-16" },
    { head: "MAY", amt: 250, date: "2026-09-16" },
    { head: "JUNE", amt: 250, date: "2026-09-16" },
    { head: "JULY", amt: 250, date: "2026-09-16" },
    { head: "AUGUST", amt: 250, date: "2026-09-16" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-16" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-16" }
  ]},
  { roll: 16, name: "Manvi Tiwari", father: "Manoj Tiwari", village: "Kammarpur", mobile: "9628747223", admStatus: "PAID", admAmt: 300, admDate: "2026-07-20", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-20" },
    { head: "APRIL", amt: 250, date: "2026-09-12" },
    { head: "MAY", amt: 250, date: "2026-09-12" },
    { head: "JUNE", amt: 250, date: "2026-09-12" },
    { head: "JULY", amt: 250, date: "2026-09-12" }
  ]},
  { roll: 17, name: "Lucky Soni", father: "Pawan Kumar", village: "Mayapur", mobile: "9918237904", admStatus: "PAID", admAmt: 300, admDate: "2026-07-20", payments: [] },
  { roll: 18, name: "Ayushi Yadav", father: "Ranipal Yadav", village: "Haripur", mobile: "9198227175", admStatus: "FREE", admAmt: 0, admDate: "2026-07-20", payments: [] },
  { roll: 19, name: "Adarsh Yadav", father: "Jairaj Yadav", village: "Tahirpur", mobile: "9594271890", admStatus: "PAID", admAmt: 200, admDate: "2026-07-21", payments: [] },
  { roll: 20, name: "Ritesh Yadav", father: "Mahendra Yadav", village: "Tahirpur", mobile: "9128661003", admStatus: "PAID", admAmt: 300, admDate: "2026-07-21", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-21" },
    { head: "JULY", amt: 250, date: "2026-09-07" },
    { head: "AUGUST", amt: 250, date: "2026-09-07" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-07" }
  ]},
  { roll: 21, name: "Suhani Yadav", father: "Avadh Bihari Yadav", village: "Hinduabad", mobile: "8112352446", admStatus: "FREE", admAmt: 0, admDate: "2026-07-21", payments: [] },
  { roll: 22, name: "Ritu Yadav", father: "Rajbahadur Yadav", village: "Hinduabad", mobile: "9198694318", admStatus: "FREE", admAmt: 0, admDate: "2026-07-21", payments: [] },
  { roll: 23, name: "Mahak", father: "Ashok Kumar", village: "Tahirpur", mobile: "7052011914", admStatus: "FREE", admAmt: 0, admDate: "2026-07-22", payments: [] },
  { roll: 24, name: "Kishan Mishra", father: "Raghav Mishra", village: "Pahadpur Kalan", mobile: "8770955521", admStatus: "PAID", admAmt: 500, admDate: "2026-07-23", payments: [] },
  { roll: 25, name: "Himanshu", father: "Arjun", village: "Haripur", mobile: "9628079992", admStatus: "PAID", admAmt: 300, admDate: "2026-07-24", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-24" },
    { head: "APRIL", amt: 250, date: "2026-09-18" },
    { head: "MAY", amt: 250, date: "2026-09-18" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-18" }
  ]},
  { roll: 26, name: "Srishti", father: "Ramesh", village: "Haripur", mobile: "6388968769", admStatus: "PAID", admAmt: 300, admDate: "2026-07-27", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-27" }
  ]},
  { roll: 27, name: "Abhinav Yadav", father: "Akhilesh Yadav", village: "Haripur", mobile: "9628545791", admStatus: "PAID", admAmt: 500, admDate: "2026-07-28", payments: [
    { head: "ADMISSION", amt: 500, date: "2026-07-28" },
    { head: "APRIL", amt: 250, date: "2026-09-15" },
    { head: "MAY", amt: 250, date: "2026-09-15" },
    { head: "JUNE", amt: 250, date: "2026-09-15" },
    { head: "JULY", amt: 250, date: "2026-09-15" }
  ]},
  { roll: 28, name: "Lavish Yadav", father: "Rajendra Yadav", village: "Gauratikari", mobile: "8953509698", admStatus: "PAID", admAmt: 300, admDate: "2026-07-28", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-28" },
    { head: "APRIL", amt: 250, date: "2026-09-30" },
    { head: "MAY", amt: 250, date: "2026-09-30" },
    { head: "JUNE", amt: 250, date: "2026-09-30" },
    { head: "JULY", amt: 250, date: "2026-09-30" }
  ]},
  { roll: 29, name: "Swachi", father: "Mahendra Prajapati", village: "Gauratikari", mobile: "9082964570", admStatus: "PAID", admAmt: 300, admDate: "2026-07-29", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-29" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 30, name: "Sonali Prajapati", father: "Surendra Prajapati", village: "Gauratikari", mobile: "9702305993", admStatus: "PAID", admAmt: 300, admDate: "2026-07-29", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-29" },
    { head: "APRIL", amt: 250, date: "2026-09-12" },
    { head: "MAY", amt: 250, date: "2026-09-12" },
    { head: "JUNE", amt: 250, date: "2026-09-12" },
    { head: "JULY", amt: 250, date: "2026-09-12" },
    { head: "AUGUST", amt: 250, date: "2026-09-12" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-12" }
  ]},
  { roll: 31, name: "Gauravi Upadhyay", father: "Vivek Upadhyay", village: "Haripur", mobile: "7054534773", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 32, name: "Zainab", father: "Abdul Hasan", village: "Samhauli", mobile: "8452588372", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 250, date: "2026-09-21" },
    { head: "MAY", amt: 250, date: "2026-09-21" }
  ]},
  { roll: 33, name: "Ayan Shekh", father: "Abdul Shekh", village: "Samhauli", mobile: "8452588372", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 34, name: "Rishika", father: "Shivkumar", village: "Pahadpur Kalan", mobile: "9170892040", admStatus: "PAID", admAmt: 300, admDate: "2026-07-30", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-07-30" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-09-14" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-14" }
  ]},
  { roll: 35, name: "Sapna", father: "Lalmani", village: "Haripur", mobile: "", admStatus: "PAID", admAmt: 300, admDate: "2026-08-06", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-06" },
    { head: "APRIL", amt: 250, date: "2026-08-06" }
  ]},
  { roll: 36, name: "Praveen", father: "Pankaj", village: "Haripur", mobile: "9026037173", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 37, name: "Chand Shekh", father: "Khursheed Shekh", village: "Samhauli", mobile: "9998176646", admStatus: "PAID", admAmt: 300, admDate: "2026-08-06", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-06" },
    { head: "APRIL", amt: 250, date: "2026-08-06" },
    { head: "MAY", amt: 250, date: "2026-09-17" },
    { head: "JUNE", amt: 250, date: "2026-09-17" },
    { head: "JULY", amt: 250, date: "2026-09-17" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-08" }
  ]},
  { roll: 38, name: "Anjani", father: "Shailesh Mishra", village: "Karaundi Kalan", mobile: "9696042666", admStatus: "PAID", admAmt: 300, admDate: "2026-08-07", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-07" },
    { head: "APRIL", amt: 250, date: "2026-10-09" },
    { head: "MAY", amt: 250, date: "2026-10-09" },
    { head: "JUNE", amt: 250, date: "2026-10-09" },
    { head: "JULY", amt: 250, date: "2026-10-09" },
    { head: "AUGUST", amt: 250, date: "2026-10-09" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-09" }
  ]},
  { roll: 39, name: "Neetu Yadav", father: "Hanuman Prasad Yadav", village: "Haripur", mobile: "7081989955", admStatus: "PAID", admAmt: 300, admDate: "2026-08-11", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-11" },
    { head: "APRIL", amt: 250, date: "2026-08-11" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-12" }
  ]},
  { roll: 40, name: "Priyanshu Yadav", father: "Suresh Yadav", village: "Haripur", mobile: "7081989955", admStatus: "PAID", admAmt: 300, admDate: "2026-08-11", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-11" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-12" }
  ]},
  { roll: 41, name: "Arpit Yadav", father: "Rakesh Kumar Yadav", village: "Tahirpur", mobile: "9670547494", admStatus: "PAID", admAmt: 300, admDate: "2026-08-11", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-11" }
  ]},
  { roll: 42, name: "Chandrakesh Tiwari", father: "Manoj Tiwari", village: "Karaundi Kalan", mobile: "6389774562", admStatus: "FREE", admAmt: 0, admDate: "2026-08-11", payments: [
    { head: "APRIL", amt: 250, date: "2026-09-15" },
    { head: "MAY", amt: 250, date: "2026-09-15" },
    { head: "JUNE", amt: 250, date: "2026-09-15" },
    { head: "QUARTERLY_EXAM", amt: 200, date: "2026-09-15" }
  ]},
  { roll: 43, name: "Abhay Agrahari", father: "Ram Surat Agrahari", village: "Pahadpur Kalan", mobile: "9565238087", admStatus: "PAID", admAmt: 300, admDate: "2026-08-11", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-11" },
    { head: "APRIL", amt: 250, date: "2026-10-29" },
    { head: "MAY", amt: 250, date: "2026-10-29" },
    { head: "JUNE", amt: 250, date: "2026-10-29" }
  ]},
  { roll: 44, name: "Shiva Yadav", father: "Dinesh Yadav", village: "Tahirpur", mobile: "8355020861", admStatus: "PAID", admAmt: 300, admDate: "2026-08-12", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-12" }
  ]},
  { roll: 45, name: "Chandni", father: "Anil", village: "Tahirpur", mobile: "8112935158", admStatus: "PAID", admAmt: 300, admDate: "2026-08-12", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-12" },
    { head: "APRIL", amt: 250, date: "2026-10-07" },
    { head: "MAY", amt: 250, date: "2026-10-07" },
    { head: "JUNE", amt: 250, date: "2026-10-07" },
    { head: "JULY", amt: 250, date: "2026-10-07" }
  ]},
  { roll: 46, name: "Damini", father: "Shobhnath Yadav", village: "Khalispur", mobile: "7267869569", admStatus: "PAID", admAmt: 250, admDate: "2026-08-21", payments: [
    { head: "ADMISSION", amt: 250, date: "2026-08-21" },
    { head: "APRIL", amt: 250, date: "2026-09-14" },
    { head: "MAY", amt: 250, date: "2026-09-14" },
    { head: "JUNE", amt: 250, date: "2026-09-14" },
    { head: "JULY", amt: 250, date: "2026-09-14" },
    { head: "AUGUST", amt: 250, date: "2026-10-15" },
    { head: "SEPTEMBER", amt: 250, date: "2026-10-15" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-10-15" },
    { head: "OCTOBER", amt: 250, date: "2026-10-15" }
  ]},
  { roll: 47, name: "Priya Yadav", father: "Lallu Yadav", village: "Khalispur", mobile: "9699459397", admStatus: "PAID", admAmt: 300, admDate: "2026-08-25", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-08-25" },
    { head: "APRIL", amt: 250, date: "2026-08-25" }
  ]},
  { roll: 48, name: "Rishu Yadav", father: "Premchandra Yadav", village: "Haripur", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [
    { head: "APRIL", amt: 250, date: "2026-09-01" },
    { head: "MAY", amt: 250, date: "2026-09-01" },
    { head: "JUNE", amt: 250, date: "2026-09-01" },
    { head: "JULY", amt: 250, date: "2026-09-16" },
    { head: "AUGUST", amt: 250, date: "2026-09-16" },
    { head: "SEPTEMBER", amt: 250, date: "2026-09-16" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-16" }
  ]},
  { roll: 49, name: "Khushi", father: "Rahul", village: "Karaundi Kalan", mobile: "8423590826", admStatus: "PAID", admAmt: 300, admDate: "2026-09-09", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-09" }
  ]},
  { roll: 50, name: "Palak", father: "Rahul", village: "Karaundi Kalan", mobile: "8423590826", admStatus: "FREE", admAmt: 0, admDate: "2026-09-09", payments: [] },
  { roll: 51, name: "Swachi", father: "Mahendra", village: "Karaundi Kalan", mobile: "", admStatus: "PENDING", admAmt: 0, admDate: null, payments: [] },
  { roll: 52, name: "Suraj", father: "Shivkumar", village: "Pahadpur Kalan", mobile: "9170892040", admStatus: "PAID", admAmt: 300, admDate: "2026-09-15", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-15" }
  ]},
  { roll: 53, name: "Arpit", father: "Vishram", village: "Tahirpur", mobile: "9702952093", admStatus: "PAID", admAmt: 300, admDate: "2026-09-15", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-15" }
  ]},
  { roll: 54, name: "Arpit Sharma", father: "Ranjeet Sharma", village: "Haripur", mobile: "9616132495", admStatus: "PAID", admAmt: 300, admDate: "2026-09-15", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-15" },
    { head: "APRIL", amt: 250, date: "2026-09-15" },
    { head: "MAY", amt: 250, date: "2026-09-15" },
    { head: "JUNE", amt: 250, date: "2026-09-15" },
    { head: "JULY", amt: 250, date: "2026-09-15" },
    { head: "AUGUST", amt: 250, date: "2026-09-15" },
    { head: "QUARTERLY_EXAM", amt: 250, date: "2026-09-15" }
  ]},
  { roll: 55, name: "Ragini", father: "Sabhajeet", village: "Samhauli", mobile: "", admStatus: "PAID", admAmt: 300, admDate: "2026-09-16", payments: [
    { head: "ADMISSION", amt: 300, date: "2026-09-16" },
    { head: "APRIL", amt: 250, date: "2026-09-18" },
    { head: "MAY", amt: 250, date: "2026-09-18" },
    { head: "JUNE", amt: 250, date: "2026-09-18" },
    { head: "JULY", amt: 250, date: "2026-09-18" }
  ]}
];

async function seedClass(className, studentList) {
  console.log(`\n========================================`);
  console.log(`Starting Upsert for ${className} (${studentList.length} students)...`);
  console.log(`========================================`);

  for (const item of studentList) {
    // 1. Upsert Student
    const student = await prisma.student.upsert({
      where: {
        class_name_roll_no_academic_year: {
          class_name: className,
          roll_no: item.roll,
          academic_year: "2026-27",
        },
      },
      update: {
        student_name: item.name,
        father_name: item.father,
        village: item.village,
        mobile: item.mobile,
        admission_fee_status: item.admStatus,
        admission_fee_amount: item.admAmt,
        admission_fee_date: item.admDate,
      },
      create: {
        class_name: className,
        roll_no: item.roll,
        academic_year: "2026-27",
        student_name: item.name,
        father_name: item.father,
        village: item.village,
        mobile: item.mobile,
        admission_fee_status: item.admStatus,
        admission_fee_amount: item.admAmt,
        admission_fee_date: item.admDate,
        joined_month: "APRIL",
        status: "ACTIVE",
        previous_class_due: 0,
      },
    });

    // 2. Upsert Fee Payments
    for (const p of item.payments) {
      const existingPayment = await prisma.feePayment.findUnique({
        where: {
          student_id_fee_head_academic_year: {
            student_id: student.id,
            fee_head: p.head,
            academic_year: "2026-27",
          },
        },
      });

      if (existingPayment) {
        // Update amount & date if needed
        await prisma.feePayment.update({
          where: { id: existingPayment.id },
          data: {
            amount_paid: p.amt,
            payment_date: p.date,
            class_name: className,
          },
        });
      } else {
        // Increment atomic receipt counter
        const counter = await prisma.receiptCounter.upsert({
          where: { year: "2026" },
          update: { last_count: { increment: 1 } },
          create: { year: "2026", last_count: 1 },
        });

        const receiptNo = `SVSS-2026-${String(counter.last_count).padStart(3, "0")}`;

        await prisma.feePayment.create({
          data: {
            student_id: student.id,
            fee_head: p.head,
            amount_paid: p.amt,
            payment_date: p.date,
            receipt_no: receiptNo,
            class_name: className,
            academic_year: "2026-27",
            collected_by: "Fee Collector",
          },
        });
      }
    }
  }

  const count = await prisma.student.count({
    where: { class_name: className, academic_year: "2026-27" },
  });
  console.log(`✔ Finished ${className}: ${count} total students verified in database.`);
}

async function main() {
  console.log("====================================================================");
  console.log("SWAMI VIVEKANAND SIKSHAN SANSTHAN — MASTER DATABASE SEED SCRIPT");
  console.log("Class 6 (36), Class 7 (28), Class 8 (55) — Session 2026-27");
  console.log("====================================================================");

  // Ensure default fee structures exist
  const classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
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

  // Seed All 3 Classes Idempotently
  await seedClass("Class 6", CLASS_6_STUDENTS);
  await seedClass("Class 7", CLASS_7_STUDENTS);
  await seedClass("Class 8", CLASS_8_STUDENTS);

  // Final Counts Verification
  const c6Count = await prisma.student.count({ where: { class_name: "Class 6", academic_year: "2026-27" } });
  const c7Count = await prisma.student.count({ where: { class_name: "Class 7", academic_year: "2026-27" } });
  const c8Count = await prisma.student.count({ where: { class_name: "Class 8", academic_year: "2026-27" } });
  const totalCount = await prisma.student.count({ where: { academic_year: "2026-27" } });
  const totalPayments = await prisma.feePayment.count({ where: { academic_year: "2026-27" } });

  console.log("\n====================================================================");
  console.log("FINAL DATABASE VERIFICATION SUMMARY (Session 2026-27):");
  console.log(`  Class 6 Students : ${c6Count} (Expected: 36)`);
  console.log(`  Class 7 Students : ${c7Count} (Expected: 28)`);
  console.log(`  Class 8 Students : ${c8Count} (Expected: 55)`);
  console.log(`  Total Students   : ${totalCount} (Expected: 119)`);
  console.log(`  Total Payments   : ${totalPayments}`);
  console.log("====================================================================");
}

main()
  .catch((e) => {
    console.error("Master Seed Script Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

