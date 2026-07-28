-- Add new columns to investments table for console upgrade
ALTER TABLE investments ADD COLUMN IF NOT EXISTS workload TEXT DEFAULT 'healthcare';
ALTER TABLE investments ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE investments ADD COLUMN IF NOT EXISTS efficiency_score INTEGER DEFAULT 100;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS datacenter TEXT DEFAULT 'US-East-1';

-- Create workload_history table for tracking user choices
CREATE TABLE IF NOT EXISTS workload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  workload TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on workload_history
ALTER TABLE workload_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own workload history
CREATE POLICY "Users can view their own workload history"
  ON workload_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM investments
    WHERE investments.id = workload_history.investment_id
    AND investments.user_phone = (auth.jwt() ->> 'phone')::text
  ));

-- Add RPC for updating investment workload and logging history
CREATE OR REPLACE FUNCTION update_investment_workload(
  p_investment_id UUID,
  p_workload TEXT,
  p_user_phone TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE investments
  SET workload = p_workload
  WHERE id = p_investment_id AND user_phone = p_user_phone;
  
  INSERT INTO workload_history (investment_id, workload)
  VALUES (p_investment_id, p_workload);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RPC for updating last_executed_at (optimization)
CREATE OR REPLACE FUNCTION update_investment_optimization(
  p_investment_id UUID,
  p_user_phone TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE investments
  SET last_executed_at = NOW(),
      efficiency_score = LEAST(100, efficiency_score + 5)
  WHERE id = p_investment_id AND user_phone = p_user_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
