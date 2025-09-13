--
-- PostgreSQL database dump
--

\restrict OQOLM9K0lc8WmvidfOBXy05kDrQ1U2VvjzzFAZclfJtNXZ0PNYryXSf8N7NJCEb

-- Dumped from database version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: principal
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'TEACHER',
    'STUDENT'
);


ALTER TYPE public.userrole OWNER TO principal;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO principal;

--
-- Name: attendances; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.attendances (
    id integer NOT NULL,
    student_id integer NOT NULL,
    classroom_id integer NOT NULL,
    date date NOT NULL,
    status character varying(50) NOT NULL,
    recorded_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.attendances OWNER TO principal;

--
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendances_id_seq OWNER TO principal;

--
-- Name: attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.attendances_id_seq OWNED BY public.attendances.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    table_name character varying(50),
    record_id integer,
    old_values json,
    new_values json,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone
);


ALTER TABLE public.audit_logs OWNER TO principal;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO principal;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.classrooms (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    level character varying(50) NOT NULL,
    academic_year character varying(10) NOT NULL,
    head_teacher_id integer,
    max_students integer,
    created_at timestamp without time zone,
    assigned_by integer
);


ALTER TABLE public.classrooms OWNER TO principal;

--
-- Name: classrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.classrooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classrooms_id_seq OWNER TO principal;

--
-- Name: classrooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.classrooms_id_seq OWNED BY public.classrooms.id;


--
-- Name: evaluation_periods; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.evaluation_periods (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    academic_year character varying(10) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.evaluation_periods OWNER TO principal;

--
-- Name: evaluation_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.evaluation_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_periods_id_seq OWNER TO principal;

--
-- Name: evaluation_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.evaluation_periods_id_seq OWNED BY public.evaluation_periods.id;


--
-- Name: evaluation_types; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.evaluation_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    default_weight double precision
);


ALTER TABLE public.evaluation_types OWNER TO principal;

--
-- Name: evaluation_types_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.evaluation_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_types_id_seq OWNER TO principal;

--
-- Name: evaluation_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.evaluation_types_id_seq OWNED BY public.evaluation_types.id;


--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.evaluations (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    evaluation_period_id integer NOT NULL,
    evaluation_type_id integer NOT NULL,
    subject_id integer NOT NULL,
    classroom_id integer NOT NULL,
    evaluation_date date NOT NULL,
    created_by integer NOT NULL,
    max_points numeric(6,2),
    weight double precision,
    is_published boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.evaluations OWNER TO principal;

--
-- Name: evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluations_id_seq OWNER TO principal;

--
-- Name: evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.evaluations_id_seq OWNED BY public.evaluations.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    student_id integer NOT NULL,
    evaluation_id integer NOT NULL,
    subject_id integer NOT NULL,
    points_earned numeric(6,2) NOT NULL,
    points_possible numeric(6,2) NOT NULL,
    percentage numeric(5,2),
    letter_grade character varying(5),
    comments text,
    is_excused boolean,
    created_at timestamp without time zone,
    created_by integer
);


ALTER TABLE public.grades OWNER TO principal;

--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grades_id_seq OWNER TO principal;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: report_cards; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.report_cards (
    id integer NOT NULL,
    student_id integer NOT NULL,
    evaluation_period_id integer NOT NULL,
    generated_by integer NOT NULL,
    generation_date timestamp without time zone,
    overall_average numeric(4,2),
    class_rank integer,
    total_students integer,
    teacher_comments text,
    file_path character varying(500)
);


ALTER TABLE public.report_cards OWNER TO principal;

--
-- Name: report_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.report_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_cards_id_seq OWNER TO principal;

--
-- Name: report_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.report_cards_id_seq OWNED BY public.report_cards.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.students (
    id integer NOT NULL,
    user_id integer NOT NULL,
    student_number character varying(20) NOT NULL,
    classroom_id integer,
    date_of_birth date,
    address text,
    phone character varying(20),
    parent_name character varying(200),
    parent_email character varying(255),
    parent_phone character varying(20),
    enrollment_date date,
    is_enrolled boolean
);


ALTER TABLE public.students OWNER TO principal;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO principal;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    coefficient integer,
    created_at timestamp without time zone
);


ALTER TABLE public.subjects OWNER TO principal;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO principal;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: teacher_subject_classroom; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.teacher_subject_classroom (
    id integer NOT NULL,
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    classroom_id integer NOT NULL,
    academic_year character varying(10) NOT NULL,
    assigned_by integer,
    assigned_date timestamp without time zone,
    is_active boolean
);


ALTER TABLE public.teacher_subject_classroom OWNER TO principal;

--
-- Name: teacher_subject_classroom_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.teacher_subject_classroom_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teacher_subject_classroom_id_seq OWNER TO principal;

--
-- Name: teacher_subject_classroom_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.teacher_subject_classroom_id_seq OWNED BY public.teacher_subject_classroom.id;


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    employee_number character varying(20) NOT NULL,
    specialization character varying(100),
    hire_date date,
    is_head_teacher boolean,
    created_by integer
);


ALTER TABLE public.teachers OWNER TO principal;

--
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teachers_id_seq OWNER TO principal;

--
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: principal
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role public.userrole NOT NULL,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO principal;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: principal
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO principal;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: principal
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendances id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.attendances ALTER COLUMN id SET DEFAULT nextval('public.attendances_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: classrooms id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.classrooms ALTER COLUMN id SET DEFAULT nextval('public.classrooms_id_seq'::regclass);


--
-- Name: evaluation_periods id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluation_periods ALTER COLUMN id SET DEFAULT nextval('public.evaluation_periods_id_seq'::regclass);


--
-- Name: evaluation_types id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluation_types ALTER COLUMN id SET DEFAULT nextval('public.evaluation_types_id_seq'::regclass);


--
-- Name: evaluations id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations ALTER COLUMN id SET DEFAULT nextval('public.evaluations_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: report_cards id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.report_cards ALTER COLUMN id SET DEFAULT nextval('public.report_cards_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: teacher_subject_classroom id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom ALTER COLUMN id SET DEFAULT nextval('public.teacher_subject_classroom_id_seq'::regclass);


--
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: evaluation_periods evaluation_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluation_periods
    ADD CONSTRAINT evaluation_periods_pkey PRIMARY KEY (id);


--
-- Name: evaluation_types evaluation_types_name_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluation_types
    ADD CONSTRAINT evaluation_types_name_key UNIQUE (name);


--
-- Name: evaluation_types evaluation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluation_types
    ADD CONSTRAINT evaluation_types_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: report_cards report_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_number_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_number_key UNIQUE (student_number);


--
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_pkey PRIMARY KEY (id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_teacher_id_subject_id_classroom_i_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_teacher_id_subject_id_classroom_i_key UNIQUE (teacher_id, subject_id, classroom_id, academic_year);


--
-- Name: teachers teachers_employee_number_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_employee_number_key UNIQUE (employee_number);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: attendances attendances_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: attendances attendances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: classrooms classrooms_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: classrooms classrooms_head_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_head_teacher_id_fkey FOREIGN KEY (head_teacher_id) REFERENCES public.teachers(id);


--
-- Name: evaluations evaluations_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: evaluations evaluations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.teachers(id);


--
-- Name: evaluations evaluations_evaluation_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_evaluation_period_id_fkey FOREIGN KEY (evaluation_period_id) REFERENCES public.evaluation_periods(id);


--
-- Name: evaluations evaluations_evaluation_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_evaluation_type_id_fkey FOREIGN KEY (evaluation_type_id) REFERENCES public.evaluation_types(id);


--
-- Name: evaluations evaluations_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: grades grades_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: grades grades_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id);


--
-- Name: grades grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: grades grades_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: report_cards report_cards_evaluation_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_evaluation_period_id_fkey FOREIGN KEY (evaluation_period_id) REFERENCES public.evaluation_periods(id);


--
-- Name: report_cards report_cards_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.teachers(id);


--
-- Name: report_cards report_cards_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: students students_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: teacher_subject_classroom teacher_subject_classroom_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teacher_subject_classroom
    ADD CONSTRAINT teacher_subject_classroom_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- Name: teachers teachers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: principal
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO principal;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO principal;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: principal
--

ALTER DEFAULT PRIVILEGES FOR ROLE principal IN SCHEMA public GRANT ALL ON TABLES TO principal;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO principal;


--
-- PostgreSQL database dump complete
--

\unrestrict OQOLM9K0lc8WmvidfOBXy05kDrQ1U2VvjzzFAZclfJtNXZ0PNYryXSf8N7NJCEb

