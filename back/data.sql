-- Populate database for Cameroonian Anglo-Saxon Secondary School System
-- Based on typical practices in Cameroon's Anglophone education system

-- Insert users (administrators, teachers, and students)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) VALUES
-- Administrator
(1, 'admin@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Admin', 'User', 'ADMIN', true, NOW(), NOW()),

-- Teachers
(2, 'john.mbeng@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'John', 'Mbeng', 'TEACHER', true, NOW(), NOW()),
(3, 'roseline.akah@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Roseline', 'Akah', 'TEACHER', true, NOW(), NOW()),
(4, 'emmanuel.ndi@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Emmanuel', 'Ndi', 'TEACHER', true, NOW(), NOW()),
(5, 'grace.tanjong@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Grace', 'Tanjong', 'TEACHER', true, NOW(), NOW()),
(6, 'patrick.musa@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Patrick', 'Musa', 'TEACHER', true, NOW(), NOW()),
(7, 'susan.amin@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Susan', 'Amin', 'TEACHER', true, NOW(), NOW()),
(8, 'thomas.nfor@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Thomas', 'Nfor', 'TEACHER', true, NOW(), NOW()),
(9, 'miriam.fon@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Miriam', 'Fon', 'TEACHER', true, NOW(), NOW()),
(10, 'david.kum@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'David', 'Kum', 'TEACHER', true, NOW(), NOW()),
(11, 'sarah.bih@school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Sarah', 'Bih', 'TEACHER', true, NOW(), NOW()),

-- Students
(12, 'chi.azeh@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Chi', 'Azeh', 'STUDENT', true, NOW(), NOW()),
(13, 'mbeng.tanjang@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Mbeng', 'Tanjang', 'STUDENT', true, NOW(), NOW()),
(14, 'nfor.lekeaka@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Nfor', 'Lekeaka', 'STUDENT', true, NOW(), NOW()),
(15, 'amin.bessem@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Amin', 'Bessem', 'STUDENT', true, NOW(), NOW()),
(16, 'fru.ngwa@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Fru', 'Ngwa', 'STUDENT', true, NOW(), NOW()),
(17, 'tanjong.mforlem@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Tanjong', 'Mforlem', 'STUDENT', true, NOW(), NOW()),
(18, 'ndi.chia@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ndi', 'Chia', 'STUDENT', true, NOW(), NOW()),
(19, 'ayah.bongfen@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ayah', 'Bongfen', 'STUDENT', true, NOW(), NOW()),
(20, 'musi.ngeh@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Musi', 'Ngeh', 'STUDENT', true, NOW(), NOW()),
(21, 'kum.lilian@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Kum', 'Lilian', 'STUDENT', true, NOW(), NOW()),
(22, 'bih.che@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Bih', 'Che', 'STUDENT', true, NOW(), NOW()),
(23, 'fon.ndang@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Fon', 'Ndang', 'STUDENT', true, NOW(), NOW()),
(24, 'azeh.mbunkur@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Azeh', 'Mbunkur', 'STUDENT', true, NOW(), NOW()),
(25, 'ngang.lydia@student.school.cm', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ngang', 'Lydia', 'STUDENT', true, NOW(), NOW());

-- Insert teachers
INSERT INTO teachers (id, user_id, employee_number, specialization, hire_date, is_head_teacher, created_by) VALUES
(1, 2, 'T001', 'Mathematics and Physics', '2015-09-01', false, 1),
(2, 3, 'T002', 'English Literature', '2017-09-01', false, 1),
(3, 4, 'T003', 'French', '2018-09-01', true, 1),
(4, 5, 'T004', 'History and Geography', '2016-09-01', false, 1),
(5, 6, 'T005', 'Biology and Chemistry', '2019-09-01', false, 1),
(6, 7, 'T006', 'Computer Science', '2020-09-01', false, 1),
(7, 8, 'T007', 'Economics', '2018-09-01', false, 1),
(8, 9, 'T008', 'Physical Education', '2017-09-01', false, 1),
(9, 10, 'T009', 'Arts and Music', '2019-09-01', false, 1),
(10, 11, 'T010', 'Philosophy', '2021-09-01', false, 1);

-- Insert classrooms (Forms 1-5, Lower Sixth, Upper Sixth)
INSERT INTO classrooms (id, name, level, academic_year, head_teacher_id, max_students, created_at, assigned_by) VALUES
(1, 'Form 1A', 'Form 1', '2025/2026', 3, 45, NOW(), 1),
(2, 'Form 2A', 'Form 2', '2025/2026', 3, 45, NOW(), 1),
(3, 'Form 3A', 'Form 3', '2025/2026', 3, 45, NOW(), 1),
(4, 'Form 4A', 'Form 4', '2025/2026', 3, 45, NOW(), 1),
(5, 'Form 5A', 'Form 5', '2025/2026', 3, 45, NOW(), 1),
(6, 'Lower Sixth Arts', 'Lower Sixth', '2025/2026', 3, 35, NOW(), 1),
(7, 'Lower Sixth Science', 'Lower Sixth', '2025/2026', 3, 35, NOW(), 1),
(8, 'Upper Sixth Arts', 'Upper Sixth', '2025/2026', 3, 35, NOW(), 1),
(9, 'Upper Sixth Science', 'Upper Sixth', '2025/2026', 3, 35, NOW(), 1);

-- Insert subjects with coefficients (based on Cameroonian Anglophone system)
INSERT INTO subjects (id, name, code, coefficient, created_at) VALUES
-- Form 1-3 subjects
(1, 'English Language', 'ENG', 3, NOW()),
(2, 'Mathematics', 'MATH', 3, NOW()),
(3, 'French', 'FREN', 3, NOW()),
(4, 'Literature in English', 'LIT', 2, NOW()),
(5, 'Geography', 'GEOG', 2, NOW()),
(6, 'History', 'HIST', 2, NOW()),
(7, 'Citizenship Education', 'CIT', 2, NOW()),
(8, 'Biology', 'BIO', 2, NOW()),
(9, 'Chemistry', 'CHEM', 2, NOW()),
(10, 'Physics', 'PHY', 2, NOW()),
(11, 'Computer Science', 'COMP', 2, NOW()),
(12, 'Religious Studies', 'REL', 2, NOW()),
(13, 'Physical Education', 'PE', 1, NOW()),
-- Form 4-5 subjects (higher coefficients)
(14, 'Advanced Mathematics', 'ADV_MATH', 5, NOW()),
(15, 'Further Mathematics', 'FUR_MATH', 5, NOW()),
(16, 'Economics', 'ECON', 5, NOW()),
(17, 'Philosophy', 'PHIL', 5, NOW()),
(18, 'Logic', 'LOG', 5, NOW()),
-- Sixth Form subjects
(19, 'Advanced Physics', 'ADV_PHY', 5, NOW()),
(20, 'Advanced Chemistry', 'ADV_CHEM', 5, NOW()),
(21, 'Advanced Biology', 'ADV_BIO', 5, NOW()),
(22, 'Geography (Advanced)', 'ADV_GEOG', 5, NOW()),
(23, 'History (Advanced)', 'ADV_HIST', 5, NOW()),
(24, 'Literature (Advanced)', 'ADV_LIT', 5, NOW());

-- Assign teachers to subjects and classrooms
INSERT INTO teacher_subject_classroom (id, teacher_id, subject_id, classroom_id, academic_year, assigned_by, assigned_date, is_active) VALUES
-- Form 1 assignments
(1, 1, 2, 1, '2025/2026', 1, NOW(), true),  -- Math
(2, 2, 1, 1, '2025/2026', 1, NOW(), true),  -- English
(3, 3, 3, 1, '2025/2026', 1, NOW(), true),  -- French
-- Form 2 assignments
(4, 1, 2, 2, '2025/2026', 1, NOW(), true),
(5, 2, 1, 2, '2025/2026', 1, NOW(), true),
(6, 3, 3, 2, '2025/2026', 1, NOW(), true),
-- Form 3 assignments
(7, 1, 2, 3, '2025/2026', 1, NOW(), true),
(8, 2, 1, 3, '2025/2026', 1, NOW(), true),
(9, 3, 3, 3, '2025/2026', 1, NOW(), true),
(10, 7, 16, 3, '2025/2026', 1, NOW(), true),  -- Economics
-- Form 4 assignments
(11, 1, 14, 4, '2025/2026', 1, NOW(), true),  -- Advanced Math
(12, 2, 1, 4, '2025/2026', 1, NOW(), true),
(13, 3, 3, 4, '2025/2026', 1, NOW(), true),
(14, 7, 16, 4, '2025/2026', 1, NOW(), true),
-- Form 5 assignments
(15, 1, 14, 5, '2025/2026', 1, NOW(), true),
(16, 2, 1, 5, '2025/2026', 1, NOW(), true),
(17, 3, 3, 5, '2025/2026', 1, NOW(), true),
(18, 7, 16, 5, '2025/2026', 1, NOW(), true),
-- Lower Sixth Science assignments
(19, 1, 15, 7, '2025/2026', 1, NOW(), true),  -- Further Math
(20, 5, 21, 7, '2025/2026', 1, NOW(), true),  -- Advanced Biology
-- Upper Sixth Science assignments
(21, 1, 15, 9, '2025/2026', 1, NOW(), true),
(22, 5, 21, 9, '2025/2026', 1, NOW(), true);

-- Insert evaluation periods based on Cameroonian academic calendar
INSERT INTO evaluation_periods (id, name, academic_year, start_date, end_date, is_active, created_at) VALUES
-- First Term evaluations
(1, 'Sequence 1', '2025/2026', '2025-10-06', '2025-10-10', false, NOW()),
(2, 'Sequence 2', '2025/2026', '2025-12-01', '2025-12-05', false, NOW()),
(3, 'First Term Exams', '2025/2026', '2026-01-12', '2026-01-16', false, NOW()),
-- Second Term evaluations
(4, 'Sequence 3', '2025/2026', '2026-02-23', '2026-02-27', false, NOW()),
(5, 'Sequence 4', '2025/2026', '2026-04-20', '2026-04-24', false, NOW()),
(6, 'Second Term Exams', '2025/2026', '2026-05-18', '2026-05-22', true, NOW()),
-- Third Term evaluations
(7, 'Sequence 5', '2025/2026', '2026-06-15', '2026-06-19', false, NOW()),
(8, 'Third Term Exams', '2025/2026', '2026-07-13', '2026-07-17', false, NOW());

-- Insert evaluation types
INSERT INTO evaluation_types (id, name, description, default_weight) VALUES
(1, 'Class Test', 'Short classroom assessment', 0.2),
(2, 'Assignment', 'Homework or project', 0.15),
(3, 'Quiz', 'Quick knowledge check', 0.1),
(4, 'Mid-Term Exam', 'Half-term examination', 0.25),
(5, 'Final Exam', 'End of term examination', 0.3);

-- Insert students with parent information
INSERT INTO students (id, user_id, student_number, classroom_id, date_of_birth, address, phone, parent_name, parent_email, parent_phone, enrollment_date, is_enrolled) VALUES
-- Form 1 students
(1, 12, 'S2025001', 1, '2012-03-15', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Azeh', 'parent1@example.com', '+237 6XX XXX XXX', '2025-09-01', true),
(2, 13, 'S2025002', 1, '2012-07-22', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Tanjang', 'parent2@example.com', '+237 6XX XXX XXX', '2025-09-01', true),
-- Form 2 students
(3, 14, 'S2024001', 2, '2011-05-18', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Lekeaka', 'parent3@example.com', '+237 6XX XXX XXX', '2024-09-01', true),
(4, 15, 'S2024002', 2, '2011-09-30', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Bessem', 'parent4@example.com', '+237 6XX XXX XXX', '2024-09-01', true),
-- Form 3 students
(5, 16, 'S2023001', 3, '2010-01-10', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Ngwa', 'parent5@example.com', '+237 6XX XXX XXX', '2023-09-01', true),
(6, 17, 'S2023002', 3, '2010-11-05', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Mforlem', 'parent6@example.com', '+237 6XX XXX XXX', '2023-09-01', true),
-- Form 4 students
(7, 18, 'S2022001', 4, '2009-02-14', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Chia', 'parent7@example.com', '+237 6XX XXX XXX', '2022-09-01', true),
(8, 19, 'S2022002', 4, '2009-08-20', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Bongfen', 'parent8@example.com', '+237 6XX XXX XXX', '2022-09-01', true),
-- Form 5 students
(9, 20, 'S2021001', 5, '2008-04-25', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Ngeh', 'parent9@example.com', '+237 6XX XXX XXX', '2021-09-01', true),
(10, 21, 'S2021002', 5, '2008-12-03', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Lilian', 'parent10@example.com', '+237 6XX XXX XXX', '2021-09-01', true),
-- Lower Sixth Science students
(11, 22, 'S2020001', 7, '2007-06-12', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Che', 'parent11@example.com', '+237 6XX XXX XXX', '2020-09-01', true),
(12, 23, 'S2020002', 7, '2007-09-28', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Ndang', 'parent12@example.com', '+237 6XX XXX XXX', '2020-09-01', true),
-- Upper Sixth Science students
(13, 24, 'S2019001', 9, '2006-03-08', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mr. Mbunkur', 'parent13@example.com', '+237 6XX XXX XXX', '2019-09-01', true),
(14, 25, 'S2019002', 9, '2006-10-15', 'Bamenda, NW Region', '+237 6XX XXX XXX', 'Mrs. Lydia', 'parent14@example.com', '+237 6XX XXX XXX', '2019-09-01', true);

-- Insert sample evaluations
INSERT INTO evaluations (id, name, description, evaluation_period_id, evaluation_type_id, subject_id, classroom_id, evaluation_date, created_by, max_points, weight, is_published, created_at) VALUES
-- Form 1 Math evaluations for Sequence 1
(1, 'Math Class Test - Seq 1', 'Basic arithmetic test', 1, 1, 2, 1, '2025-10-07', 1, 20, 0.2, true, NOW()),
(2, 'Math Quiz - Seq 1', 'Algebra basics', 1, 3, 2, 1, '2025-10-09', 1, 10, 0.1, true, NOW()),
-- Form 1 English evaluations for Sequence 1
(3, 'English Assignment - Seq 1', 'Essay writing', 1, 2, 1, 1, '2025-10-06', 2, 15, 0.15, true, NOW()),
(4, 'English Final Exam - Seq 1', 'Comprehensive test', 1, 5, 1, 1, '2025-10-10', 2, 60, 0.3, true, NOW());

-- Insert sample grades
INSERT INTO grades (id, student_id, evaluation_id, subject_id, points_earned, points_possible, percentage, letter_grade, comments, is_excused, created_at, created_by) VALUES
-- Grades for Student 1 (Form 1)
(1, 1, 1, 2, 16, 20, 80.00, 'B', 'Good effort', false, NOW(), 1),
(2, 1, 2, 2, 8, 10, 80.00, 'B', 'Consistent performance', false, NOW(), 1),
(3, 1, 3, 1, 12, 15, 80.00, 'B', 'Well written essay', false, NOW(), 2),
(4, 1, 4, 1, 48, 60, 80.00, 'B', 'Good overall performance', false, NOW(), 2),
-- Grades for Student 2 (Form 1)
(5, 2, 1, 2, 18, 20, 90.00, 'A', 'Excellent work', false, NOW(), 1),
(6, 2, 2, 2, 9, 10, 90.00, 'A', 'Outstanding', false, NOW(), 1),
(7, 2, 3, 1, 14, 15, 93.33, 'A', 'Exceptional writing', false, NOW(), 2),
(8, 2, 4, 1, 54, 60, 90.00, 'A', 'Top of class', false, NOW(), 2);

-- Insert sample attendance records
INSERT INTO attendances (id, student_id, classroom_id, date, status, recorded_by, created_at, updated_at) VALUES
(1, 1, 1, '2025-09-15', 'Present', 1, NOW(), NOW()),
(2, 2, 1, '2025-09-15', 'Present', 1, NOW(), NOW()),
(3, 1, 1, '2025-09-16', 'Absent', 1, NOW(), NOW()),
(4, 2, 1, '2025-09-16', 'Present', 1, NOW(), NOW());

-- Update sequences to prevent primary key conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('teachers_id_seq', (SELECT MAX(id) FROM teachers));
SELECT setval('classrooms_id_seq', (SELECT MAX(id) FROM classrooms));
SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));
SELECT setval('teacher_subject_classroom_id_seq', (SELECT MAX(id) FROM teacher_subject_classroom));
SELECT setval('evaluation_periods_id_seq', (SELECT MAX(id) FROM evaluation_periods));
SELECT setval('evaluation_types_id_seq', (SELECT MAX(id) FROM evaluation_types));
SELECT setval('evaluations_id_seq', (SELECT MAX(id) FROM evaluations));
SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));
SELECT setval('grades_id_seq', (SELECT MAX(id) FROM grades));
SELECT setval('attendances_id_seq', (SELECT MAX(id) FROM attendances));