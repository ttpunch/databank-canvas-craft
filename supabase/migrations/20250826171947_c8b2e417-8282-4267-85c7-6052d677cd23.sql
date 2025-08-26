-- Create categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT NOT NULL DEFAULT (auth.uid())::text
);

-- Create follow_ups table
CREATE TABLE public.follow_ups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT NOT NULL DEFAULT (auth.uid())::text
);

-- Enable RLS on both tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Users can view own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid()::text = created_by);

CREATE POLICY "Users can create own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid()::text = created_by);

CREATE POLICY "Users can delete own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid()::text = created_by);

-- Create RLS policies for follow_ups
CREATE POLICY "Users can view own follow_ups" 
ON public.follow_ups 
FOR SELECT 
USING (auth.uid()::text = created_by);

CREATE POLICY "Users can create own follow_ups" 
ON public.follow_ups 
FOR INSERT 
WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update own follow_ups" 
ON public.follow_ups 
FOR UPDATE 
USING (auth.uid()::text = created_by);

CREATE POLICY "Users can delete own follow_ups" 
ON public.follow_ups 
FOR DELETE 
USING (auth.uid()::text = created_by);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_categories_created_by ON public.categories(created_by);
CREATE INDEX idx_follow_ups_created_by ON public.follow_ups(created_by);
CREATE INDEX idx_follow_ups_record_id ON public.follow_ups(record_id);
CREATE INDEX idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX idx_follow_ups_due_date ON public.follow_ups(due_date);

-- Insert some default categories
INSERT INTO public.categories (name, description, color) VALUES 
('General', 'General records and notes', '#8B5CF6'),
('Important', 'Important and urgent records', '#EF4444'),
('Work', 'Work-related records', '#3B82F6'),
('Personal', 'Personal records and notes', '#10B981');