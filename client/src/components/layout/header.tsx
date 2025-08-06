import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddAssetModal from "@/components/modals/add-asset-modal";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // TODO: Implement search functionality
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="text-slate-600 mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
              <Input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Add Asset Button */}
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white flex items-center space-x-2"
            >
              <i className="fas fa-plus"></i>
              <span>Add Asset</span>
            </Button>
          </div>
        </div>
      </header>

      <AddAssetModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
    </>
  );
}
