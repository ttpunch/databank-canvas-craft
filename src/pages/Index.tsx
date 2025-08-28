import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, User, Database, Filter, Settings, LogOut } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react'; // Import BookOpen icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// Components
import StatsCard from '@/components/dashboard/StatsCard';
import NewRecordDialog from '@/components/records/NewRecordDialog';
import RecordsList from '@/components/records/RecordsList';
import EditRecordDialog from '@/components/records/EditRecordDialog';
import ExportButtons from '@/components/export/ExportButtons';
import RecordsTableReport from '@/components/records/RecordsTableReport';
import FollowUpCard from '@/components/follow-ups/FollowUpCard';
import RescheduleFollowUpDialog from '@/components/follow-ups/RescheduleFollowUpDialog';
import RecordDetailDialog from '@/components/records/RecordDetailDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [overdueFollowUpsCount, setOverdueFollowUpsCount] = useState(0); // New state for overdue count
  const [reschedulingFollowUp, setReschedulingFollowUp] = useState(null); // State for rescheduling
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false); // State for reschedule dialog
  const [viewingRecord, setViewingRecord] = useState(null); // State for viewing a record
  const [recordDetailDialogOpen, setRecordDetailDialogOpen] = useState(false); // State for record detail dialog
  const [isLoadingRecords, setIsLoadingRecords] = useState(true); // New loading state for records
  const [stats, setStats] = useState({
    totalRecords: 0,
    monthlyActivity: 0,
    completionRate: 0,
    categoriesCount: 0
  });

  const navigate = useNavigate(); // Initialize useNavigate

  const fetchData = async () => {
    try {
      setIsLoadingRecords(true); // Set loading to true at the start of fetching
      // Fetch records
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) {
        // console.error("Error fetching records:", recordsError);
        throw recordsError;
      }
      setRecords(recordsData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        // console.error("Error fetching categories:", categoriesError);
        throw categoriesError;
      }
      setCategories(categoriesData || []);

      // Fetch follow-ups
      const { data: followUpsData, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .order('due_date', { ascending: true });

      if (followUpsError) {
        // console.error("Error fetching follow-ups:", followUpsError);
        throw followUpsError;
      }
      setFollowUps(followUpsData || []);

      // Calculate overdue follow-ups
      const now = new Date();
      const overdue = followUpsData?.filter(f => new Date(f.due_date) < now && f.status === 'pending').length || 0;
      setOverdueFollowUpsCount(overdue);

      // Calculate stats
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRecords = recordsData?.filter(record => 
        new Date(record.created_at) >= thisMonth
      ) || [];
      
      const completedFollowUps = followUpsData?.filter(f => f.status === 'completed') || [];
      const totalFollowUps = followUpsData?.length || 0;
      const completionRate = totalFollowUps > 0 ? (completedFollowUps.length / totalFollowUps) * 100 : 0;

      setStats({
        totalRecords: recordsData?.length || 0,
        monthlyActivity: monthlyRecords.length,
        completionRate: Math.round(completionRate),
        categoriesCount: categoriesData?.length || 0
      });

    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecords(false); // Set loading to false when fetching is complete
    }
  }

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  }

  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Record deleted",
        description: "The record has been successfully deleted.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  }

  const handleViewDetails = (record: any) => {
    setViewingRecord(record);
    setRecordDetailDialogOpen(true);
  }

  // New: Handle completing a follow-up
  const handleCompleteFollowUp = async (id: string) => {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Follow-up completed",
        description: "The reminder has been marked as completed.",
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // New: Handle rescheduling a follow-up
  const handleRescheduleFollowUp = (followUp: any) => {
    setReschedulingFollowUp(followUp);
    setRescheduleDialogOpen(true);
  }

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.description?.replace(/<[^>]*>/g, '').toLowerCase().includes(searchQuery.toLowerCase()) || // Include description with HTML stripped
    record.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.notes_history?.some(note => note.content.toLowerCase().includes(searchQuery.toLowerCase())) // Include notes history
  );

  // Redirect to auth if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card text-card-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 py-3 sm:py-0"
          >
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <Database className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary-foreground">Dashboard</h1>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 w-full sm:w-auto ml-auto">
              <NewRecordDialog categories={categories} onRecordCreated={fetchData} />
              <Button variant="outline" onClick={() => navigate('/knowledge-bank')} className="w-full sm:w-auto">
                <BookOpen className="mr-2 h-4 w-4" />
                Knowledge Bank
              </Button>
              
              <ExportButtons records={filteredRecords} />
             
              <ThemeToggle />
             
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full sm:w-auto text-foreground">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.email}</span>
                    {overdueFollowUpsCount > 0 && (
                      <Badge variant="destructive" className="ml-1 px-2 py-0.5 text-xs rounded-full">
                        {overdueFollowUpsCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2 text-destructive-foreground" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative w-full max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records by title, description, category, or date... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-input text-input-foreground border-border"
            />
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8"
        >
          <StatsCard
            title="Total Records"
            value={stats.totalRecords}
            subtitle="+12% from last period"
            icon={Database}
            variant="default"
          />
          <StatsCard
            title="Monthly Activity"
            value={stats.monthlyActivity}
            subtitle="6% from last period"
            icon={Search}
            variant="info"
          />
          <StatsCard
            title="Completion Rate"
            value={`${stats.completionRate}%`}
            subtitle="Weekly progress"
            icon={Filter}
            variant="warning"
          />
          <StatsCard
            title="Categories"
            value={stats.categoriesCount}
            subtitle="0 pending items"
            icon={Settings}
            variant="default"
          />
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Tabs defaultValue="records" className="space-y-6">
            <TabsList>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="records" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Records</h2>
                {filteredRecords.length > 0 && (
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{filteredRecords.length} records</Badge>
                )}
              </div>
              
              {isLoadingRecords ? (
                <div className="flex justify-center items-center h-40">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
                  ></motion.div>
                </div>
              ) : (
                <RecordsList 
                  records={filteredRecords}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteRecord}
                  onViewDetails={handleViewDetails} // Add this prop
                />
              )}
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Records Report</h2>
                {filteredRecords.length > 0 && (
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{filteredRecords.length} records</Badge>
                )}
              </div>
              {isLoadingRecords ? (
                <div className="flex justify-center items-center h-40">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
                  ></motion.div>
                </div>
              ) : (
                <RecordsTableReport records={filteredRecords} />
              )}
            </TabsContent>

            <TabsContent value="follow-ups" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Follow-ups</h2>
                {followUps.length > 0 && (
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{followUps.length} follow-ups</Badge>
                )}
              </div>
              
              {isLoadingRecords ? (
                <div className="flex justify-center items-center h-40">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
                  ></motion.div>
                </div>
              ) : (
                followUps.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Settings className="h-12 w-12 text-muted-foreground mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-muted-foreground text-muted-foreground">No follow-ups found</h3>
                      <p className="text-sm text-muted-foreground text-muted-foreground">Create follow-ups for your records to track progress.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {followUps.map((followUp) => (
                      <FollowUpCard 
                        key={followUp.id} 
                        followUp={followUp} 
                        onReschedule={handleRescheduleFollowUp} 
                        onComplete={handleCompleteFollowUp} 
                      />
                    ))}
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      {/* Edit Record Dialog */}
      <EditRecordDialog
        record={editingRecord}
        categories={categories}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onRecordUpdated={fetchData}
      />

      {/* Reschedule Follow-up Dialog */}
      <RescheduleFollowUpDialog
        followUp={reschedulingFollowUp}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        onFollowUpRescheduled={fetchData}
      />

      {/* Record Detail Dialog */}
      <RecordDetailDialog
        record={viewingRecord}
        open={recordDetailDialogOpen}
        onOpenChange={setRecordDetailDialogOpen}
        followUps={followUps}
      />
    </div>
  );
}

export default Index;
