-- Apply to existing `remmogodb`. Skip any statement that errors if already applied.

ALTER TABLE MotsheloGroups
  MODIFY monthly_contrib DECIMAL(12,2) NOT NULL DEFAULT 1000,
  MODIFY interest_rate DECIMAL(6,2) NOT NULL DEFAULT 20,
  MODIFY target_interest DECIMAL(12,2) NOT NULL DEFAULT 5000;

ALTER TABLE Loans ADD COLUMN disbursed_at DATETIME NULL;
ALTER TABLE Loans ADD COLUMN next_accrual_date DATE NULL;

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

UPDATE Loans
SET disbursed_at = COALESCE(disbursed_at, requested_at),
    next_accrual_date = COALESCE(
      next_accrual_date,
      DATE_ADD(DATE_FORMAT(COALESCE(requested_at, NOW()), '%Y-%m-01'), INTERVAL 1 MONTH)
    )
WHERE status = 'APPROVED' AND next_accrual_date IS NULL;
