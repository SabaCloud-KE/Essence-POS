'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatKsh } from '@/lib/utils';
import {
  Scissors,
  Plus,
  Edit2,
  Power,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hair Styling & Care',
    price: 1500,
    durationMinutes: 45,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const [allServices, catList] = await Promise.all([
        api.getServices(),
        api.getCategories(),
      ]);
      setServices(allServices);
      setCategories(['All', ...catList]);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setActiveId(null);
    setFormData({
      name: '',
      category: categories[1] || 'Hair Styling & Care',
      price: 1500,
      durationMinutes: 45,
      description: '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (service: any) => {
    setModalMode('edit');
    setActiveId(service.id);
    setFormData({
      name: service.name,
      category: service.category,
      price: service.price,
      durationMinutes: service.durationMinutes,
      description: service.description || '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleToggleActive = async (id: number) => {
    try {
      await api.toggleServiceActive(id);
      fetchServices();
    } catch (err) {
      alert('Failed to toggle service status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      if (modalMode === 'create') {
        await api.createService(formData);
      } else if (activeId) {
        await api.updateService(activeId, formData);
      }
      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesCat =
      selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <Scissors className="w-6 h-6 text-gold-600" />
            <span>Service Catalog Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure salon treatments, pricing (KSh), durations, and active status
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-gold-500 text-white shadow-sm'
                  : 'bg-cream-50 text-gray-600 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] min-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
              <tr>
                <th className="p-3.5">Service Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5 text-right">Price (KSh)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gold-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    No services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-cream-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-obsidian-900">{service.name}</div>
                      {service.description && (
                        <div className="text-[11px] text-gray-400 line-clamp-1 max-w-sm">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                        {service.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-500 font-medium">
                      {service.durationMinutes} mins
                    </td>
                    <td className="p-3.5 text-right font-bold text-obsidian-900 font-mono text-sm">
                      {formatKsh(service.price)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          service.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1.5 rounded-lg bg-cream-100 hover:bg-gold-500 hover:text-white text-gray-600 transition"
                          title="Edit Service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(service.id)}
                          className={`p-1.5 rounded-lg transition ${
                            service.isActive
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                          title={service.isActive ? 'Deactivate Service' : 'Reactivate Service'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT SERVICE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-cream-300 relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-bold text-base text-obsidian-900">
                {modalMode === 'create' ? 'Add New Salon Service' : 'Edit Service Details'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Silk Press & Scalp Steam"
                  className="w-full p-2.5 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Category"
                    className="w-full p-2.5 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Price (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                    className="w-full p-2.5 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Estimated Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Description / Treatment Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Included wash, products used, styling finish..."
                  className="w-full p-2.5 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500"
                />
              </div>

              <div className="pt-3 border-t border-cream-200 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : modalMode === 'create' ? (
                    'Add Service'
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-cream-300 text-gray-600 text-xs font-semibold hover:bg-cream-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
