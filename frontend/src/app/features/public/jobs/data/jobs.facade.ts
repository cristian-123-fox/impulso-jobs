import { Injectable, signal } from '@angular/core';
import {
  FooterCol,
  Job,
  JobDetail,
  JobType,
} from '@/features/public/jobs/models/jobs.models';

@Injectable({ providedIn: 'root' })
export class JobsFacade {
  private readonly _jobs = signal<readonly Job[]>((() => {
    const green = { badge: 'New', badgeBg: '#e6f7ef', badgeColor: '#1fae6a', postedColor: '#e8607a' };
    const orange = { badge: 'Intership', badgeBg: '#fef3e6', badgeColor: '#f0a04b', postedColor: '#1fae6a' };
    const purple = { badge: 'Fulltime', badgeBg: '#efeafe', badgeColor: '#7a5bd6', postedColor: '#f0a04b' };
    const teal = { badge: 'Freelancer', badgeBg: '#e6f7f5', badgeColor: '#1aa89a', postedColor: '#8a8a9e' };
    const gold = { badge: 'Temporary', badgeBg: '#f3ead0', badgeColor: '#b8912f', postedColor: '#e8607a' };
    const base = [
      { title: 'Senior Web Designer', posted: '1 days ago', logoText: 'COMPANY', logoBg: '#fff2e8', logoColor: '#ff6a00', ...green },
      { title: 'Sr. Rolling Stock Technician', posted: '15 days ago', logoText: 'BUSINESS', logoBg: '#f2fbf8', logoColor: '#1aa89a', ...orange },
      { title: 'IT Department Manager', posted: '6 Month ago', logoText: 'COMPANY NAME', logoBg: '#f6f9f2', logoColor: '#7bb03a', ...purple },
      { title: 'Art Production Specialist', posted: '2 days ago', logoText: 'ARROW', logoBg: '#fff7f2', logoColor: '#f0703b', ...teal },
      { title: 'Recreation & Fitness Worker', posted: '1 days ago', logoText: 'VECTOR LOGO', logoBg: '#fff5f7', logoColor: '#e8607a', ...gold },
    ];
    const salaries = ['$2500', '$2500', '$2000', '$1500', '$800', '$1000', '$1500', '$2500', '$3000', '$2000', '$2000', '$1800', '$1000', '$1000', '$1000', '$1000', '$1000', '$1000'];
    const jobs: Job[] = [];
    for (let i = 0; i < 18; i++) {
      jobs.push({ ...base[i % base.length], salary: salaries[i] });
    }
    return jobs;
  })());

  private readonly _jobTypes = signal<readonly JobType[]>([
    { name: 'Freelance', count: '09' },
    { name: 'Full Time', count: '07' },
    { name: 'Internship', count: '15' },
    { name: 'Part Time', count: '20' },
    { name: 'Temporary', count: '22' },
    { name: 'Volunteer', count: '25' },
  ]);

  private readonly _datePosts = signal<readonly string[]>(['Last hour', 'Last 24 hours', 'Last 7 days', 'Last 14 days', 'Last 30 days', 'All']);
  private readonly _employment = signal<readonly string[]>(['Freelance', 'Full Time', 'Intership', 'Part Time']);
  private readonly _recruiting = signal<readonly string[]>(['Freelance', 'Full Time', 'Intership', 'Part Time']);
  private readonly _tags = signal<readonly string[]>(['General', 'Jobs', 'Payment', 'Application', 'Work', 'Recruiting', 'Employer', 'Income', 'Tips']);
  private readonly _footerCols = signal<readonly FooterCol[]>([
    { title: 'For Candidate', links: ['User Dashboard', 'Alert resume', 'Candidates', 'Blog List', 'Blog single'] },
    { title: 'For Employers', links: ['Post Jobs', 'Blog Grid', 'Contact', 'Jobs Listing', 'Jobs details'] },
    { title: 'Helpful Resources', links: ['FAQs', 'Employer detail', 'Profile', '404 Page', 'Pricing'] },
    { title: 'Quick Links', links: ['Home', 'About us', 'Bookmark', 'Jobs', 'Employer'] },
  ]);
  private readonly _jobDetail = signal<JobDetail>({
    title: 'IT Department Manager',
    posted: '1 days ago',
    logoText: 'COMPANY',
    logoColor: '#f0703b',
    badge: 'New',
    location: '1363-1385 Sunset Blvd Los Angeles, CA 90026, USA',
    website: 'https://thewebmax.com',
    salary: '$2000 - $2500',
    deadline: 'October 1, 2025',
    description: [
      'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.'
    ],
    requirements: [
      'Must be able to communicate with others to convey information effectively.',
      'Personally passionate and up to date with current trends and technologies, committed to quality and comfortable working with adult media.',
      'Bachelor or Master degree level educational background.',
      '4 years relevant PHP dev experience.',
      'Troubleshooting, testing and maintaining the core product software and databases.'
    ],
    responsibilities: [
      'Establish and promote design guidelines, best practices and standards.',
      'Accurately estimate design tickets during planning sessions.',
      'Partnering with product and engineering to translate business and user goals into elegant and practical designs. that can deliver on key business and user metrics.',
      'Create wireframes, storyboards, user flows, process flows and site maps to communicate interaction and design.',
      'Present and defend designs and key deliverables to peers and executive level stakeholders.',
      'Execute all visual design stages from concept to final hand-off to engineering.'
    ],
    shares: [
      { name: 'Facebook', bg: '#3b5998' },
      { name: 'X', bg: '#1a1a1a' },
      { name: 'Linkedin', bg: '#0a66c2' },
      { name: 'Whatsapp', bg: '#25a35a' },
      { name: 'Pinterest', bg: '#e60023' }
    ],
    jobInfo: [
      { icon: 'calendar', label: 'Date Posted', value: 'April 22, 2026' },
      { icon: 'pin', label: 'Location', value: 'Munchen, Germany' },
      { icon: 'user', label: 'Job Title', value: 'Web Developer' },
      { icon: 'clock', label: 'Experience', value: '3 Year' },
      { icon: 'chart', label: 'Qualification', value: 'Bachelor Degree' },
      { icon: 'gender', label: 'Gender', value: 'Both' },
      { icon: 'wallet', label: 'Offered Salary', value: '$2000-$2500 / Month' }
    ],
    skills: ['Html', 'Python', 'WordPress', 'JavaScript', 'Figma', 'Angular', 'Reactjs', 'Drupal', 'Joomla'],
    contact: [
      { icon: 'building', label: 'Company', value: 'Software Development' },
      { icon: 'phone', label: 'Phone', value: '+291 560 56456' },
      { icon: 'at', label: 'Email', value: 'thewebmaxdemo@gmail.com' },
      { icon: 'monitor', label: 'Website', value: 'https://themeforest.net' },
      { icon: 'pin', label: 'Address', value: '1363-1385 Sunset Blvd Angeles, CA 90026 ,USA' }
    ],
    officePhotos: ['office-1','office-2','office-3','office-4','office-5','office-6','office-7','office-8','office-9','office-10','office-11','office-12']
  });

  private readonly _socials = signal<readonly string[]>(['f', 'X', 'in', 'P', 'i']);

  readonly jobs = this._jobs.asReadonly();
  readonly jobDetail = this._jobDetail.asReadonly();
  readonly jobTypes = this._jobTypes.asReadonly();
  readonly datePosts = this._datePosts.asReadonly();
  readonly employment = this._employment.asReadonly();
  readonly recruiting = this._recruiting.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly footerCols = this._footerCols.asReadonly();
  readonly socials = this._socials.asReadonly();
}
