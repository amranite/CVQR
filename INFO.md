## 1. Project Overview

**Project Name:** CVQR
**Goal:** Build a secure mobile-first prototype for sharing student CVs with companies during a yearly meetup event

---

## 2. Problem Statement

During the yearly meetup event:
- Students print multiple copies of their CV
- Some print too many, others too few
- Students must carry physical copies
- Companies must collect and organize paper CVs

This results in inefficiency, waste, and inconvenience.

---

## 3. Proposed Solution

A mobile-first application that allows:
- Students to upload their CV (PDF)
- The system to generate a unique QR code
- Companies to scan the QR code
- Companies to view and download the CV

The goal is a **working prototype**

---

## 4. Target Users

### Students

- Age: +18
- Upload their CV
- Generate QR code
- Share CV during event

### Companies

- Scan student QR codes
- View and optionally download CV
- Only access CVs they physically scanned

---

## 5. Core Functional Requirements (MVP)

### Student

- Register
- Login / Authentication
- Upload CV (PDF only)
- Replace/update CV
- Delete CV
- View QR code

### Company

- Register
- Login / Authentication
- Scan QR code using phone camera
- View CV
- Download CV

### Admin

- Login / Authentication
- Delete CVs
