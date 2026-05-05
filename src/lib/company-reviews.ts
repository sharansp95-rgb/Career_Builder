export interface CompanyReview {
  author: string;
  text: string;
  rating: number;
}

export interface CompanyData {
  rating: number;
  reviewCount: number;
  reviews: CompanyReview[];
}

const COMPANY_REVIEWS: Record<string, CompanyData> = {
  // ─── Indian Tech Giants ────────────────────────────────────────────────────
  "Tata Consultancy Services": {
    rating: 4.1,
    reviewCount: 2840,
    reviews: [
      { author: "Priya M.", text: "Great learning opportunities and strong brand value.", rating: 4 },
      { author: "Rahul S.", text: "Work-life balance can be tough on client projects.", rating: 3 },
      { author: "Anjali K.", text: "Excellent training programmes for freshers.", rating: 5 },
    ],
  },
  "Infosys": {
    rating: 3.9,
    reviewCount: 3120,
    reviews: [
      { author: "Vikram P.", text: "Good campus and cafeteria. Hierarchy can slow things down.", rating: 4 },
      { author: "Sneha R.", text: "Solid platform to build foundational skills.", rating: 4 },
      { author: "Arjun D.", text: "Salary increments are on the lower side.", rating: 3 },
    ],
  },
  "Wipro": {
    rating: 3.8,
    reviewCount: 2650,
    reviews: [
      { author: "Meera J.", text: "Nice work culture and friendly colleagues.", rating: 4 },
      { author: "Suresh B.", text: "Good for freshers but growth is slow.", rating: 3 },
      { author: "Divya N.", text: "Strong CSR activities and value-driven company.", rating: 4 },
    ],
  },
  "HCL Technologies": {
    rating: 3.9,
    reviewCount: 1980,
    reviews: [
      { author: "Karan M.", text: "Competitive pay and good tech stack exposure.", rating: 4 },
      { author: "Pooja S.", text: "Management is supportive and approachable.", rating: 4 },
      { author: "Rohit V.", text: "Work pressure on some projects can be high.", rating: 3 },
    ],
  },
  "Tech Mahindra": {
    rating: 3.7,
    reviewCount: 1560,
    reviews: [
      { author: "Nisha G.", text: "Good global exposure and diverse projects.", rating: 4 },
      { author: "Amit C.", text: "Appraisals could be more transparent.", rating: 3 },
      { author: "Ritu L.", text: "Work-life balance varies by team.", rating: 4 },
    ],
  },
  // ─── Product/Startup companies ─────────────────────────────────────────────
  "Flipkart": {
    rating: 4.3,
    reviewCount: 1200,
    reviews: [
      { author: "Aarav S.", text: "Fast-paced, high-impact work. Great engineering culture.", rating: 5 },
      { author: "Kavya R.", text: "Excellent free lunches and perks!", rating: 4 },
      { author: "Siddharth M.", text: "Scale of problems you solve here is unmatched.", rating: 5 },
    ],
  },
  "Zomato": {
    rating: 4.0,
    reviewCount: 890,
    reviews: [
      { author: "Ishaan P.", text: "Startup energy even at this scale. Exciting product.", rating: 4 },
      { author: "Tanvi A.", text: "Good ESOP policies and growth opportunities.", rating: 4 },
      { author: "Manish K.", text: "Targets can be very aggressive.", rating: 3 },
    ],
  },
  "Swiggy": {
    rating: 4.1,
    reviewCount: 760,
    reviews: [
      { author: "Riya S.", text: "Great culture of ownership and autonomy.", rating: 4 },
      { author: "Vivek T.", text: "Very good compensation and stock options.", rating: 5 },
      { author: "Preeti N.", text: "Weekend crunches near release deadlines.", rating: 3 },
    ],
  },
  "Razorpay": {
    rating: 4.5,
    reviewCount: 540,
    reviews: [
      { author: "Aditya K.", text: "Best engineering team I have worked with.", rating: 5 },
      { author: "Neha M.", text: "Transparent leadership and clear roadmap.", rating: 5 },
      { author: "Rohan G.", text: "Slightly smaller team means you wear many hats.", rating: 4 },
    ],
  },
  "PhonePe": {
    rating: 4.2,
    reviewCount: 620,
    reviews: [
      { author: "Shruti B.", text: "High ownership culture. Great fintech exposure.", rating: 4 },
      { author: "Varun S.", text: "Excellent benefits and compensation package.", rating: 5 },
      { author: "Deepa R.", text: "Work can be intense, but always rewarding.", rating: 4 },
    ],
  },
  "BYJU'S": {
    rating: 3.4,
    reviewCount: 1100,
    reviews: [
      { author: "Ankit J.", text: "Great mission but execution has been rocky recently.", rating: 3 },
      { author: "Sonal T.", text: "High target pressure in sales roles.", rating: 2 },
      { author: "Akash V.", text: "Tech team is solid; other functions face issues.", rating: 4 },
    ],
  },
  "Paytm": {
    rating: 3.6,
    reviewCount: 980,
    reviews: [
      { author: "Kritika S.", text: "Pioneer in fintech — good brand recognition.", rating: 4 },
      { author: "Nikhil G.", text: "Frequent reorgs can be disorienting.", rating: 3 },
      { author: "Harsha P.", text: "Good exposure to payments infrastructure.", rating: 4 },
    ],
  },
  // ─── MNCs in India ─────────────────────────────────────────────────────────
  "Google India": {
    rating: 4.7,
    reviewCount: 480,
    reviews: [
      { author: "Sahil M.", text: "World-class infrastructure and brilliant colleagues.", rating: 5 },
      { author: "Lalitha R.", text: "20% time policy is real and highly valued.", rating: 5 },
      { author: "Faisal A.", text: "Bar is very high, but growth is equally fast.", rating: 4 },
    ],
  },
  "Microsoft India": {
    rating: 4.6,
    reviewCount: 560,
    reviews: [
      { author: "Sanjay K.", text: "Growth mindset culture is genuinely practised.", rating: 5 },
      { author: "Preethi V.", text: "Excellent work-life balance compared to other MNCs.", rating: 5 },
      { author: "Arnav B.", text: "Great learning budget and certifications support.", rating: 4 },
    ],
  },
  "Amazon India": {
    rating: 3.9,
    reviewCount: 1340,
    reviews: [
      { author: "Chetan R.", text: "Learn fast, ship fast. Leadership Principles keep you grounded.", rating: 4 },
      { author: "Sunita A.", text: "High performance bar — not for everyone.", rating: 3 },
      { author: "Karthik N.", text: "Compensation is great; WLB varies by team.", rating: 4 },
    ],
  },
};

/** Returns reviews for a company, falling back to generic data for unknown names. */
export function getCompanyData(company: string): CompanyData {
  // Direct match
  if (COMPANY_REVIEWS[company]) return COMPANY_REVIEWS[company];

  // Partial match (e.g. "TCS" → "Tata Consultancy Services")
  const key = Object.keys(COMPANY_REVIEWS).find(
    (k) =>
      k.toLowerCase().includes(company.toLowerCase()) ||
      company.toLowerCase().includes(k.toLowerCase())
  );
  if (key) return COMPANY_REVIEWS[key];

  // Deterministic fallback using company name hash
  const hash = [...company].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rating = 3.2 + (hash % 18) / 10; // 3.2 – 4.9
  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount: 50 + (hash % 500),
    reviews: [
      { author: "Employee", text: "Good environment with room to grow.", rating: Math.ceil(rating) },
      { author: "Software Engineer", text: "Collaborative team and decent pay.", rating: Math.floor(rating) },
      { author: "Verified Review", text: "Interesting problems to solve day-to-day.", rating: Math.round(rating) },
    ],
  };
}
