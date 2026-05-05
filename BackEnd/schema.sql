-- RE-MMOGO MySQL schema (reference + fresh install)
-- Database: remmogodb (or set via DB_NAME)

CREATE TABLE IF NOT EXISTS Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(64) NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS MotsheloGroups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  monthly_contrib DECIMAL(12,2) NOT NULL DEFAULT 1000,
  interest_rate DECIMAL(6,2) NOT NULL DEFAULT 20,
  target_interest DECIMAL(12,2) NOT NULL DEFAULT 5000,
  year INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS GroupMembers (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  is_signatory TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_user (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES MotsheloGroups(group_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Contributions (
  contribution_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  contribution_month DATE NOT NULL,
  proof_of_payment VARCHAR(2048) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES MotsheloGroups(group_id),
  FOREIGN KEY (member_id) REFERENCES GroupMembers(member_id)
);

CREATE TABLE IF NOT EXISTS ContributionApprovals (
  approval_id INT AUTO_INCREMENT PRIMARY KEY,
  contribution_id INT NOT NULL,
  signatory_id INT NOT NULL,
  decision VARCHAR(32) NOT NULL,
  notes TEXT NULL,
  decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cont_sig (contribution_id, signatory_id),
  FOREIGN KEY (contribution_id) REFERENCES Contributions(contribution_id),
  FOREIGN KEY (signatory_id) REFERENCES GroupMembers(member_id)
);

CREATE TABLE IF NOT EXISTS Loans (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  principal DECIMAL(12,2) NOT NULL,
  outstanding DECIMAL(12,2) NOT NULL,
  notes TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disbursed_at DATETIME NULL,
  next_accrual_date DATE NULL,
  FOREIGN KEY (group_id) REFERENCES MotsheloGroups(group_id),
  FOREIGN KEY (member_id) REFERENCES GroupMembers(member_id)
);

CREATE TABLE IF NOT EXISTS LoanApprovals (
  approval_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  signatory_id INT NOT NULL,
  decision VARCHAR(32) NOT NULL,
  notes TEXT NULL,
  decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_loan_sig (loan_id, signatory_id),
  FOREIGN KEY (loan_id) REFERENCES Loans(loan_id),
  FOREIGN KEY (signatory_id) REFERENCES GroupMembers(member_id)
);

CREATE TABLE IF NOT EXISTS LoanRepayments (
  repayment_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  member_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  proof_of_payment VARCHAR(2048) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES Loans(loan_id),
  FOREIGN KEY (member_id) REFERENCES GroupMembers(member_id)
);

CREATE TABLE IF NOT EXISTS LoanRepaymentApprovals (
  approval_id INT AUTO_INCREMENT PRIMARY KEY,
  repayment_id INT NOT NULL,
  signatory_id INT NOT NULL,
  decision VARCHAR(32) NOT NULL,
  notes TEXT NULL,
  decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_repay_sig (repayment_id, signatory_id),
  FOREIGN KEY (repayment_id) REFERENCES LoanRepayments(repayment_id),
  FOREIGN KEY (signatory_id) REFERENCES GroupMembers(member_id)
);
