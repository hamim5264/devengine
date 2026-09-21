export type JobStatus = "open" | "closed" | "draft";
export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Remote";
export type ApplicationStatus = "new" | "reviewing" | "shortlisted" | "rejected";

export interface JobCircular {
  id: string;
  title: string;
  department: string;
  employmentType: EmploymentType;
  location: string;
  experienceLevel: string;
  salaryRange: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  status: JobStatus;
  deadline?: string;
  deadlineDate?: string;
  order?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface JobApplication {
  id: string;
  circularId: string;
  jobTitle: string;
  applicantName: string;
  email: string;
  phone: string;
  portfolioUrl?: string;
  resumeDriveLink: string;
  experienceYears: string;
  coverNote?: string;
  status: ApplicationStatus;
  adminNotes?: string;
  appliedAt: string;
  reviewedAt?: string;
}
