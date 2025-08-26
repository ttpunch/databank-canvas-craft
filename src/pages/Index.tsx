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

// Components
import StatsCard from '@/components/dashboard/StatsCard';
import NewRecordDialog from '@/components/records/NewRecordDialog';
import RecordsList from '@/components/records/RecordsList';
import EditRecordDialog from '@/components/records/EditRecordDialog';
import ExportButtons from '@/components/export/ExportButtons';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    monthlyActivity: 0,
    completionRate: 0,
    categoriesCount: 0
  });

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

  const fetchData = async () => {
    try {
      // Fetch records
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch follow-ups
      const { data: followUpsData, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .order('due_date', { ascending: true });

      if (followUpsError) throw followUpsError;
      setFollowUps(followUpsData || []);

      // Calculate stats
      const now = new Date();
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
    }
  };

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
  };

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
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">Data Recorder</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <ExportButtons records={filteredRecords} />
              <NewRecordDialog categories={categories} onRecordCreated={fetchData} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records by title, description, category, or date... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
        </div>

        {/* Main Content */}
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
          </TabsList>
          
          <TabsContent value="records" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Records</h2>
              {filteredRecords.length > 0 && (
                <Badge variant="secondary">{filteredRecords.length} records</Badge>
              )}
            </div>
            
            <RecordsList 
              records={filteredRecords}
              onEdit={handleEditRecord}
              onDelete={handleDeleteRecord}
            />
          </TabsContent>
          
          <TabsContent value="follow-ups" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Follow-ups</h2>
              {followUps.length > 0 && (
                <Badge variant="secondary">{followUps.length} follow-ups</Badge>
              )}
            </div>
            
            {followUps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">No follow-ups found</h3>
                  <p className="text-sm text-muted-foreground">Create follow-ups for your records to track progress.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {followUps.map((followUp) => (
                  <Card key={followUp.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{followUp.title}</CardTitle>
                      <Badge 
                        variant={followUp.status === 'completed' ? 'default' : 'secondary'}
                        className="w-fit"
                      >
                        {followUp.status}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {followUp.description && (
                        <p className="text-sm text-muted-foreground mb-2">{followUp.description}</p>
                      )}
                      {followUp.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(followUp.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Record Dialog */}
      <EditRecordDialog
        record={editingRecord}
        categories={categories}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onRecordUpdated={fetchData}
      />
    </div>
  );
};

export default Index;
