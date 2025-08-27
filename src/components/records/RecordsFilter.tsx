import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface RecordsFilterProps {
  onFilter: (filters: { searchTerm: string; category: string }) => void;
}

const RecordsFilter: React.FC<RecordsFilterProps> = ({ onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');

  const handleFilter = () => {
    onFilter({ searchTerm, category });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategory('');
    onFilter({ searchTerm: '', category: '' });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <Input
        placeholder="Search by title or description..."
        className="flex-grow"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Input
        placeholder="Filter by category..."
        className="flex-grow"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <Button onClick={handleFilter}>
        <Search className="mr-2 h-4 w-4" /> Apply Filters
      </Button>
      <Button variant="outline" onClick={handleClearFilters}>
        <X className="mr-2 h-4 w-4" /> Clear Filters
      </Button>
    </div>
  );
};

export default RecordsFilter;
