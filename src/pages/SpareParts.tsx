import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import NewSparePartDialog from "@/components/spare-parts/NewSparePartDialog";
import { Input } from "@/components/ui/input";
import EditSparePartDialog from "@/components/spare-parts/EditSparePartDialog";
import ExportToPdfButton from "@/components/spare-parts/ExportToPdfButton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, LayoutList, PieChart as PieChartIcon } from 'lucide-react';
import RecordUsageDialog from "@/components/spare-parts/RecordUsageDialog";

interface SparePart {
  id: string;
  name: string;
  description: string | null;
  quantity: number | null;
  category: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null; // New field
  usage_count: number; // New field
  // New metadata fields
  part_id?: string | null;
  location?: string | null;
  supplier?: string | null;
  part_number?: string | null;
  manufacturer?: string | null;
  machine_model?: string | null;
  part_category?: string | null;
  stock_quantity?: number | null;
  min_stock_level?: number | null;
  unit_cost?: number | null;
  lead_time?: number | null;
  last_replaced_date?: string | null;
}

const CORE_COLUMN_MAPPING: { [key: string]: string[] } = {
  name: ['name', 'part name', 'item name', 'product name'],
  description: ['description', 'details', 'item description'],
  quantity: ['quantity', 'qty', 'count', 'stock'],
  category: ['category', 'type', 'group'],
  // New metadata mappings
  part_id: ['part id', 'partid', 'id'],
  location: ['location', 'loc'],
  supplier: ['supplier'],
  part_number: ['part number', 'partno'],
  manufacturer: ['manufacturer', 'make'],
  machine_model: ['machine model', 'machine'],
  part_category: ['part category', 'parttype'],
  stock_quantity: ['stock quantity', 'stockqty'],
  min_stock_level: ['min stock level', 'minstock'],
  unit_cost: ['unit cost (₹)', 'unitcost', 'cost'],
  lead_time: ['lead time (days)', 'leadtime'],
  last_replaced_date: ['last replaced date', 'lastreplaced'],
};

const LOW_STOCK_THRESHOLD = 5;

const SpareParts = () => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewPartDialogOpen, setIsNewPartDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSparePart, setSelectedSparePart] = useState<SparePart | null>(null);
  const { toast } = useToast();
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [isRecordUsageDialogOpen, setIsRecordUsageDialogOpen] = useState(false);
  const [partToRecordUsage, setPartToRecordUsage] = useState<SparePart | null>(null);

  const fetchSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*, last_used_at, usage_count, part_id, location, supplier, part_number, manufacturer, machine_model, part_category, stock_quantity, min_stock_level, unit_cost, lead_time, last_replaced_date'); // Select new fields

      if (error) {
        throw error;
      }
      setSpareParts(data as SparePart[]);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error fetching data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpareParts();
  }, []);

  const handleSelectPart = (id: string, isSelected: boolean) => {
    setSelectedPartIds((prevSelected) =>
      isSelected ? [...prevSelected, id] : prevSelected.filter((partId) => partId !== id)
    );
  };

  const handleSelectAllParts = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedPartIds(filteredSpareParts.map((part) => part.id));
    } else {
      setSelectedPartIds([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Failed to read file.");
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const newSpareParts: Omit<SparePart, 'id' | 'created_at' | 'updated_at' | 'last_used_at' | 'usage_count'>[] = json.map((row) => {
          let name: string | null = null;
          let description: string | null = null;
          let quantity: number | null = null;
          let category: string | null = null;
          let part_id: string | null = null;
          let location: string | null = null;
          let supplier: string | null = null;
          let part_number: string | null = null;
          let manufacturer: string | null = null;
          let machine_model: string | null = null;
          let part_category: string | null = null;
          let stock_quantity: number | null = null;
          let min_stock_level: number | null = null;
          let unit_cost: number | null = null;
          let lead_time: number | null = null;
          let last_replaced_date: string | null = null;
          const metadata: Record<string, any> = {};

          for (const key in row) {
            const lowerKey = key.toLowerCase();
            let isCoreColumn = false;

            for (const coreCol in CORE_COLUMN_MAPPING) {
              if (CORE_COLUMN_MAPPING[coreCol].includes(lowerKey)) {
                switch (coreCol) {
                  case 'name': name = String(row[key]); break;
                  case 'description': description = String(row[key]); break;
                  case 'quantity': quantity = Number(row[key]); break;
                  case 'category': category = String(row[key]); break;
                  case 'part_id': part_id = String(row[key]); break;
                  case 'location': location = String(row[key]); break;
                  case 'supplier': supplier = String(row[key]); break;
                  case 'part_number': part_number = String(row[key]); break;
                  case 'manufacturer': manufacturer = String(row[key]); break;
                  case 'machine_model': machine_model = String(row[key]); break;
                  case 'part_category': part_category = String(row[key]); break;
                  case 'stock_quantity': stock_quantity = Number(row[key]); break;
                  case 'min_stock_level': min_stock_level = Number(row[key]); break;
                  case 'unit_cost': unit_cost = Number(row[key]); break;
                  case 'lead_time': lead_time = Number(row[key]); break;
                  case 'last_replaced_date': last_replaced_date = String(row[key]); break;
                }
                isCoreColumn = true;
                break;
              }
            }
            if (!isCoreColumn) {
              metadata[key] = row[key];
            }
          }

          return {
            name: name || 'Unknown Part',
            description,
            quantity: quantity || 0,
            category,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
            part_id,
            location,
            supplier,
            part_number,
            manufacturer,
            machine_model,
            part_category,
            stock_quantity,
            min_stock_level,
            unit_cost,
            lead_time,
            last_replaced_date,
          };
        });

        if (newSpareParts.length > 0) {
          const { error: insertError } = await supabase
            .from('spare_parts')
            .insert(newSpareParts);

          if (insertError) {
            throw insertError;
          }
          toast({
            title: "Upload Successful",
            description: `${newSpareParts.length} spare parts uploaded.`,
          });
          fetchSpareParts(); // Re-fetch data to update the table
        } else {
          toast({
            title: "No data found",
            description: "The Excel file did not contain any usable data.",
            variant: "default",
          });
        }
      } catch (err: any) {
        toast({
          title: "Upload Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeletePart = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      toast({
        title: "Spare Part Deleted",
        description: `'${name}' has been successfully deleted.`,
      });
      fetchSpareParts(); // Re-fetch data to update the table
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedPartIds.length} selected spare parts?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .in('id', selectedPartIds);

      if (error) {
        throw error;
      }
      toast({
        title: "Bulk Deletion Successful",
        description: `${selectedPartIds.length} spare parts have been successfully deleted.`,
      });
      setSelectedPartIds([]); // Clear selection after deletion
      fetchSpareParts(); // Re-fetch data to update the table
    } catch (err: any) {
      toast({
        title: "Bulk Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRecordUsageSubmit = async (partId: string, quantityUsed: number, areaOfUse: string) => {
    const part = spareParts.find(p => p.id === partId);
    if (!part) return;

    if (quantityUsed > part.quantity!) {
      toast({
        title: "Usage Error",
        description: "Quantity used cannot be greater than current stock.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update spare_parts table
      const { error: updateError } = await supabase
        .from('spare_parts')
        .update({
          quantity: (part.quantity || 0) - quantityUsed,
          usage_count: (part.usage_count || 0) + quantityUsed,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', partId);

      if (updateError) {
        throw updateError;
      }

      // Insert into used_parts_log table
      const { error: logError } = await supabase
        .from('used_parts_log')
        .insert({
          spare_part_id: partId,
          quantity_used: quantityUsed,
          area_of_use: areaOfUse,
        });

      if (logError) {
        console.error("Error inserting into used_parts_log:", logError);
      }

      toast({
        title: "Usage Recorded",
        description: `${quantityUsed} units of '${part.name}' recorded as used in ${areaOfUse}.`,
      });
      fetchSpareParts(); // Re-fetch data to update the table
    } catch (err: any) {
      toast({
        title: "Error Recording Usage",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsUsedClick = (part: SparePart) => {
    const latestPart = spareParts.find(p => p.id === part.id);
    if (latestPart) {
      setPartToRecordUsage(latestPart);
      setIsRecordUsageDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Selected part not found in inventory.",
        variant: "destructive",
      });
    }
  };

  const filteredSpareParts = spareParts.filter(part => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const nameMatch = part.name.toLowerCase().includes(lowerSearchTerm);
    const descriptionMatch = part.description?.toLowerCase().includes(lowerSearchTerm);
    const categoryMatch = part.category?.toLowerCase().includes(lowerSearchTerm);

    const partIdMatch = part.part_id?.toLowerCase().includes(lowerSearchTerm);
    const locationMatch = part.location?.toLowerCase().includes(lowerSearchTerm);
    const supplierMatch = part.supplier?.toLowerCase().includes(lowerSearchTerm);
    const partNumberMatch = part.part_number?.toLowerCase().includes(lowerSearchTerm);
    const manufacturerMatch = part.manufacturer?.toLowerCase().includes(lowerSearchTerm);
    const machineModelMatch = part.machine_model?.toLowerCase().includes(lowerSearchTerm);
    const partCategoryMatch = part.part_category?.toLowerCase().includes(lowerSearchTerm);
    const stockQuantityMatch = String(part.stock_quantity)?.toLowerCase().includes(lowerSearchTerm);
    const minStockLevelMatch = String(part.min_stock_level)?.toLowerCase().includes(lowerSearchTerm);
    const unitCostMatch = String(part.unit_cost)?.toLowerCase().includes(lowerSearchTerm);
    const leadTimeMatch = String(part.lead_time)?.toLowerCase().includes(lowerSearchTerm);
    const lastReplacedDateMatch = part.last_replaced_date?.toLowerCase().includes(lowerSearchTerm);

    const metadataMatch = part.metadata ? Object.values(part.metadata).some(value =>
      String(value).toLowerCase().includes(lowerSearchTerm)
    ) : false;

    return nameMatch || descriptionMatch || categoryMatch || partIdMatch || locationMatch || supplierMatch || partNumberMatch || manufacturerMatch || machineModelMatch || partCategoryMatch || stockQuantityMatch || minStockLevelMatch || unitCostMatch || leadTimeMatch || lastReplacedDateMatch || metadataMatch;
  });

  // Reporting & Analysis Calculations
  const totalParts = spareParts.length;
  const lowStockParts = spareParts.filter(part => part.quantity !== null && part.quantity < LOW_STOCK_THRESHOLD);
  const mostUsedParts = [...spareParts].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5);
  const leastUsedParts = [...spareParts].sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0)).slice(0, 5);
  const notUsedRecentlyParts = spareParts.filter(part => {
    if (!part.last_used_at) return true; // Consider never used as not used recently
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(part.last_used_at) < sevenDaysAgo;
  });

  const categoriesData = spareParts.reduce((acc, part) => {
    const categoryName = part.category || 'Uncategorized';
    acc[categoryName] = (acc[categoryName] || 0) + (part.quantity || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoriesData).map(([name, value]) => ({ name, value }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0000'];

  if (loading) {
    return <div>Loading spare parts...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>CNC Spare Parts Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Input
              placeholder="Search spare parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex">
              <Button onClick={() => window.location.href = '/'} variant="outline" className="mr-2">
                Home
              </Button>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload">
                <Button asChild className="mr-2">
                  <span>Upload Excel</span>
                </Button>
              </label>
              <ExportToPdfButton data={filteredSpareParts} filename="CNC_Spare_Parts_Report" />
              {selectedPartIds.length > 0 && (
                <Button
                  variant="destructive"
                  className="ml-2"
                  onClick={handleBulkDelete}
                >
                  Delete Selected ({selectedPartIds.length})
                </Button>
              )}
              <Button onClick={() => setIsNewPartDialogOpen(true)} className="ml-2">Add New Part</Button>
            </div>
          </div>

          {/* Reporting and Analysis Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalParts}</div>
                <p className="text-xs text-muted-foreground">Total number of spare parts in inventory.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <LayoutList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{lowStockParts.length}</div>
                <p className="text-xs text-muted-foreground">Parts with quantity below {LOW_STOCK_THRESHOLD}.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Used Parts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {mostUsedParts.length > 0 ? (
                  <ul className="text-sm text-muted-foreground">
                    {mostUsedParts.map((part, index) => (
                      <li key={part.id}>{index + 1}. {part.name} ({part.usage_count} uses)</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No usage data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Not Used Recently</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {notUsedRecentlyParts.length > 0 ? (
                  <p className="text-2xl font-bold">{notUsedRecentlyParts.length}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">All parts used recently.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Parts by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Quantity" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <NewSparePartDialog
            open={isNewPartDialogOpen}
            onOpenChange={setIsNewPartDialogOpen}
            onSparePartAdded={fetchSpareParts}
          />

          <Table id="spare-parts-table-export">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={selectedPartIds.length === filteredSpareParts.length && filteredSpareParts.length > 0}
                    onChange={(e) => handleSelectAllParts(e.target.checked)}
                    className="form-checkbox"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Part ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Machine Model</TableHead>
                <TableHead>Part Category</TableHead>
                <TableHead>Stock Qty</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Unit Cost (₹)</TableHead>
                <TableHead>Lead Time (days)</TableHead>
                <TableHead>Last Replaced</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Usage Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpareParts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPartIds.includes(part.id)}
                      onChange={(e) => handleSelectPart(part.id, e.target.checked)}
                      className="form-checkbox"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell>{part.description}</TableCell>
                  <TableCell>{part.quantity}</TableCell>
                  <TableCell>{part.category}</TableCell>
                  <TableCell>{part.part_id}</TableCell>
                  <TableCell>{part.location}</TableCell>
                  <TableCell>{part.supplier}</TableCell>
                  <TableCell>{part.part_number}</TableCell>
                  <TableCell>{part.manufacturer}</TableCell>
                  <TableCell>{part.machine_model}</TableCell>
                  <TableCell>{part.part_category}</TableCell>
                  <TableCell>{part.stock_quantity}</TableCell>
                  <TableCell>{part.min_stock_level}</TableCell>
                  <TableCell>{part.unit_cost}</TableCell>
                  <TableCell>{part.lead_time}</TableCell>
                  <TableCell>{part.last_replaced_date ? new Date(part.last_replaced_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
                    {part.metadata ? (
                      <details>
                        <summary>View Details</summary>
                        <pre className="whitespace-pre-wrap text-sm">
                          {JSON.stringify(part.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{part.last_used_at ? new Date(part.last_used_at).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell>{part.usage_count}</TableCell>
                  <TableCell className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleMarkAsUsedClick(part)}>Used</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSparePart(part);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeletePart(part.id, part.name)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditSparePartDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSparePartUpdated={fetchSpareParts}
        sparePart={selectedSparePart}
      />

      {partToRecordUsage && (
        <RecordUsageDialog
          open={isRecordUsageDialogOpen}
          onOpenChange={setIsRecordUsageDialogOpen}
          onRecordUsage={(quantityUsed, areaOfUse) => handleRecordUsageSubmit(partToRecordUsage.id, quantityUsed, areaOfUse)}
          currentPartName={partToRecordUsage.name}
          currentQuantity={partToRecordUsage.quantity || 0}
        />
      )}
    </div>
  );
};

export default SpareParts;
