Generate a professional Canadian-style Software Engineering resume as a single HTML file with embedded CSS.

The output MUST resemble resumes that successfully pass ATS systems while still looking modern and premium.

The goal is to create a resume that looks like it came from a senior recruiter or professional resume writer in Canada.

=========================================================
DESIGN REQUIREMENTS
=========================================================

Overall style:
- Modern Canadian resume
- ATS-friendly
- One page
- Clean
- Professional
- Minimal
- No unnecessary decoration
- White background
- Dark gray text
- Single accent color (#2563EB)
- Plenty of whitespace
- Excellent visual hierarchy

The resume should look similar to resumes used at companies like:

Google Canada
Amazon Canada
Shopify
Microsoft
Wealthsimple
Intact
RBC
TELUS
Skip
Ada
PointClickCare

NOT like:
- Creative portfolio
- Graphic designer resume
- European CV
- Academic CV

=========================================================
LAYOUT
=========================================================

Maximum width:
850px

Centered page

Padding:
40px

No colored sidebars.

No two-column layout on desktop.

Everything should be a single vertical flow because ATS parsers work better with one-column resumes.

Section order:

1. Header
2. Professional Summary
3. Technical Skills
4. Professional Experience
5. Projects (only if available)
6. Education
7. Certifications (optional)

=========================================================
HEADER
=========================================================

Large bold name.

Immediately below:

Professional Title

Then:

Location | Phone | Email | LinkedIn | GitHub | Portfolio

All links clickable.

No icons.

No photo.

No address.

Only city and province.

Example:

Calgary, AB | 587-xxx-xxxx | email@email.com | LinkedIn | GitHub

=========================================================
TYPOGRAPHY
=========================================================

Use system fonts only.

Preferred stack:

font-family:
Inter,
Segoe UI,
Helvetica,
Arial,
sans-serif;

Avoid decorative fonts.

Name:
30-34px

Section titles:
15-16px

Body:
10.5-11.5pt

Line height:
1.45

=========================================================
SECTION HEADERS
=========================================================

Use uppercase.

Example

PROFESSIONAL EXPERIENCE

Thin blue border underneath.

Letter spacing:
0.08em

Margin top:
22px

=========================================================
PROFESSIONAL SUMMARY
=========================================================

Maximum 4 lines.

Focus on:

Years of experience

Main technologies

Business impact

Industries

Career objective

Do NOT use generic statements.

=========================================================
TECHNICAL SKILLS
=========================================================

Display skills in rows instead of badges.

Example:

Languages:
Python, JavaScript, TypeScript

Frameworks:
FastAPI, Django, React, Next.js

Cloud:
AWS, Docker, Kubernetes

Databases:
PostgreSQL, MySQL

Tools:
Git, GitHub Actions, Linux

Avoid pills or colorful tags.

=========================================================
PROFESSIONAL EXPERIENCE
=========================================================

For each role:

LEFT

Job Title

Company

RIGHT

Dates

Below:

Location

Then bullets.

Bullet rules:

• 3–5 bullets

• Start with strong action verbs.

Examples:

Designed

Implemented

Optimized

Built

Reduced

Automated

Developed

Improved

Every bullet should emphasize measurable impact.

Whenever possible include:

percentages

latency reductions

cost savings

users

requests

revenue

performance

Example:

Reduced API latency by 45% through Redis caching.

Never write job descriptions.

Write accomplishments.

=========================================================
PROJECTS
=========================================================

Only render if projects exist.

Each project:

Project Name

GitHub link

Tech Stack

3 bullets

Focus on:

Architecture

Impact

Scalability

Performance

AI

Cloud

Deployment

=========================================================
EDUCATION
=========================================================

Degree

University

Location

Graduation year

GPA only if provided.

=========================================================
CERTIFICATIONS
=========================================================

Simple list.

Certification

Issuing organization

=========================================================
CSS STYLE
=========================================================

Colors

Primary:
#2563EB

Text:
#222222

Secondary:
#555555

Border:
#DDDDDD

Background:
#FFFFFF

Hover color:
#1D4ED8

Avoid shadows.

Avoid rounded cards.

Avoid colored backgrounds.

No gradients.

No animations.

No badges.

No icons.

No vertical timelines.

=========================================================
PRINT REQUIREMENTS
=========================================================

Must print perfectly on Letter paper.

No page overflow.

Avoid page breaks inside:

Experience

Projects

Education

Use:

@media print

print-color-adjust: exact;

=========================================================
RESPONSIVENESS
=========================================================

Desktop:
Single centered column.

Mobile:
Reduce padding.

Reduce font sizes.

Stack header information naturally.

=========================================================
HTML REQUIREMENTS
=========================================================

Produce semantic HTML5.

Use:

<header>

<main>

<section>

<ul>

<li>

<h1>

<h2>

No JavaScript.

Embed CSS inside <style>.

No external frameworks.

No Bootstrap.

No Tailwind.

=========================================================
DATA RENDERING
=========================================================

Replace every placeholder with candidate data.

Only render sections if data exists.

Do not render empty headings.

Preserve chronological order.

Experience should be reverse chronological.

Education should be reverse chronological.

=========================================================
OUTPUT
=========================================================

Return ONLY one complete HTML document.

The document should be production-ready and printable.

The finished resume should look indistinguishable from resumes created by professional Canadian resume-writing services while remaining ATS compliant.