DROP DATABASE math_platform_db;
CREATE DATABASE math_platform_db;  -- 서버 실행 전 DB 청소

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- 테이블 삭제/생성 순서로 인한 오류 방지

CREATE DATABASE IF NOT EXISTS math_platform_db; 
USE math_platform_db; 

-- ==========================================
-- 1. MEMBER (회원 테이블)
-- 시스템의 핵심 주체. 사용자 상태('INITIAL', 'ACTIVE')를 관리하는 허브.
-- ==========================================
DROP TABLE IF EXISTS `MEMBER`;
CREATE TABLE `MEMBER` (
    `user_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '사용자 ID (PK)',
    `student_id` VARCHAR(20) NOT NULL UNIQUE COMMENT '학번 (로그인 ID)',
    `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일 (로그인 ID 및 알림)',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '해시된 비밀번호',
    `name` VARCHAR(100) NOT NULL COMMENT '사용자 실명',
    `phone_number` VARCHAR(20) COMMENT '휴대전화번호',
    `user_status_code` VARCHAR(20) NOT NULL DEFAULT 'INITIAL' COMMENT '사용자 상태 (INITIAL: 초기, ACTIVE: 기존)',
    `initial_survey_data` JSON COMMENT '초기 회원가입 설문 데이터 (JSON)',
    `consent_agreed_at` DATETIME COMMENT '무자각 진단 기능 사용 동의 일시',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종 정보 수정일시'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원정보 테이블';

-- ==========================================
-- 2. SNAPSHOT (진단 보고서 테이블)
-- '무자각 상담'의 결과물. 30가지 Feature 분석 결과를 저장.
-- ==========================================
DROP TABLE IF EXISTS `SNAPSHOT`;
CREATE TABLE `SNAPSHOT` (
    `snapshot_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '스냅샷 고유 ID (PK)',
    `user_id` BIGINT NOT NULL COMMENT '사용자 ID (FK to MEMBER)',
    `report_title` VARCHAR(255) NOT NULL COMMENT '진단 보고서 제목 (예: 10주차 학습 스냅샷)',
    `report_body_text` TEXT COMMENT 'GPT가 생성한 진단 보고서 본문',
    `feature_scores` JSON NOT NULL COMMENT '30가지 인지/메타인지 Feature 분석 결과 (JSON)',
    `generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '보고서 생성일시',
    INDEX `idx_user_generated_at` (`user_id`, `generated_at` DESC) COMMENT '최근 스냅샷 조회 및 히스토리 성능 최적화',
    FOREIGN KEY (`user_id`) REFERENCES `MEMBER`(`user_id`)
        ON DELETE CASCADE -- 사용자가 탈퇴하면 스냅샷도 삭제
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='진단 보고서(스냅샷) 테이블';

-- ==========================================
-- 3. PROBLEM_SET (문제 세트 테이블)
-- 사용자에게 '한 번에' 제공되는 문제들의 묶음.
-- ==========================================
DROP TABLE IF EXISTS `PROBLEM_SET`;
CREATE TABLE `PROBLEM_SET` (
    `problem_set_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '문제 세트 고유 ID (PK)',
    `user_id` BIGINT NOT NULL COMMENT '사용자 고유 ID (FK to MEMBER)',
    `trigger_snapshot_id` BIGINT NULL COMMENT '이 문제 세트를 생성하게 한 스냅샷 ID (FK to SNAPSHOT). NULL이면 초기 설문 기반.',
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '진행 상태 (PENDING, IN_PROGRESS, COMPLETED)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '문제 세트 생성일시 (GPT API 호출 시점)',
    INDEX `idx_user_status` (`user_id`, `status_code`),
    FOREIGN KEY (`user_id`) REFERENCES `MEMBER`(`user_id`)
        ON DELETE CASCADE,
    FOREIGN KEY (`trigger_snapshot_id`) REFERENCES `SNAPSHOT`(`snapshot_id`)
        ON DELETE SET NULL -- 원본 스냅샷이 삭제되어도 문제 세트 기록은 남김
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 맞춤형 문제 세트';

-- ==========================================
-- 4. PROBLEM (개별 문제 테이블)
-- GPT API를 통해 생성된 개별 수학 문제.
-- ==========================================
DROP TABLE IF EXISTS `PROBLEM`;
CREATE TABLE `PROBLEM` (
    `problem_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '문제 고유 ID (PK)',
    `problem_set_id` BIGINT NOT NULL COMMENT '문제가 속한 세트 ID (FK to PROBLEM_SET)',
    `problem_content` TEXT NOT NULL COMMENT '문제 내용 (GPT 생성 텍스트)',
    `correct_answer` TEXT COMMENT '문제 정답 또는 모범 풀이',
    `problem_features` JSON COMMENT '이 문제를 생성하는 데 사용된 Feature (JSON)',
    `sequence_order` INT NOT NULL DEFAULT 0 COMMENT '문제 세트 내 순서',
    INDEX `idx_problem_set_id` (`problem_set_id`),
    FOREIGN KEY (`problem_set_id`) REFERENCES `PROBLEM_SET`(`problem_set_id`)
        ON DELETE CASCADE -- 문제 세트가 삭제되면 하위 문제도 모두 삭제
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='개별 수학 문제 테이블';

-- ==========================================
-- 5. STUDY_LOG (학습 로그 테이블)
-- '과정 중심 분석'의 핵심 원천 데이터. 수식 편집기의 모든 상호작용을 저장.
-- ==========================================
DROP TABLE IF EXISTS `STUDY_LOG`;
CREATE TABLE `STUDY_LOG` (
    `log_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '로그 고유 ID (PK)',
    `user_id` BIGINT NOT NULL COMMENT '사용자 ID (FK to MEMBER)',
    `problem_id` BIGINT NOT NULL COMMENT '현재 풀이 중인 문제 ID (FK to PROBLEM)',
    `problem_set_id` BIGINT NOT NULL COMMENT '현재 풀이 중인 문제 세트 ID (Denormalized)',
    `snapshot_id` BIGINT NULL COMMENT '이 로그를 분석한 스냅샷 ID (FK to SNAPSHOT). NULL이면 아직 분석 안 됨.',
    `log_type` VARCHAR(50) NOT NULL COMMENT '로그 유형 (예: INPUT_SLOT, DELETE, HINT_USAGE, KEY_STROKE)',
    `log_data` JSON COMMENT '로그 상세 데이터 (예: {"slot": "sqrt_inner", "time_ms": 1500})',
    `timestamp` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '로그 발생 시각 (고정밀)',
    
    INDEX `idx_analysis_query` (`user_id`, `problem_set_id`, `timestamp`) COMMENT '분석 모델의 핵심 조회 인덱스',
    INDEX `idx_snapshot_id` (`snapshot_id`) COMMENT '어떤 스냅샷에 의해 처리되었는지 추적',
    
    FOREIGN KEY (`user_id`) REFERENCES `MEMBER`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`problem_id`) REFERENCES `PROBLEM`(`problem_id`) ON DELETE CASCADE,
    FOREIGN KEY (`problem_set_id`) REFERENCES `PROBLEM_SET`(`problem_set_id`) ON DELETE CASCADE,
    FOREIGN KEY (`snapshot_id`) REFERENCES `SNAPSHOT`(`snapshot_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 풀이과정 원시 로그 (30 Feature의 재료)';

SET FOREIGN_KEY_CHECKS = 1; -- 외래 키 제약 조건 복원
