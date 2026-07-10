export interface JobType {
  name: string;
  count: string;
}

export interface Job {
  title: string;
  posted: string;
  logoSrc: string;
  logoAlt: string;
  logoText: string;
  logoBg: string;
  logoColor: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  postedColor: string;
  salary: string;
}

export interface FooterCol {
  title: string;
  links: string[];
}

export interface Share {
  name: string;
  bg: string;
}

export interface JobInfo {
  icon: string;
  label: string;
  value: string;
}

export interface Contact {
  icon: string;
  label: string;
  value: string;
}

export interface JobDetail {
  title: string;
  posted: string;
  logoText: string;
  logoColor: string;
  badge: string;
  location: string;
  website: string;
  salary: string;
  deadline: string;
  description: string[];
  requirements: string[];
  responsibilities: string[];
  shares: Share[];
  jobInfo: JobInfo[];
  skills: string[];
  contact: Contact[];
  officePhotos: string[];
}

export interface JobsData {
  jobs: Job[];
  jobTypes: JobType[];
  datePosts: string[];
  employment: string[];
  recruiting: string[];
  tags: string[];
  footerCols: FooterCol[];
  socials: string[];
  jobDetail: JobDetail;
}
