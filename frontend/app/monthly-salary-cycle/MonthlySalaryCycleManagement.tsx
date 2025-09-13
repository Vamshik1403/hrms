"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Icon } from "@iconify/react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

interface MonthlySalaryCycle {
  id: string; // keep as string for your table keys/UI
  serviceProvider: string;
  companyName: string;
  branchName: string;
  cycleName: string;
  startDayOfMonth: number;
  createdAt: string;
}

type ApiSalaryCycle = {
  id: number;
  serviceProviderID: number | null;
  companyID: number | null;
  branchesID: number | null;
  salaryCycleName: string | null;
  monthStartDay: string | null; // "01", "15", etc
  serviceProvider?: { id: number; companyName?: string | null } | null;
  company?: { id: number; companyName?: string | null } | null;
  branches?: { id: number; branchName?: string | null } | null;
  createdAt?: string; // if present in your schema; safe-guarded
};

type SP = { id: number; companyName?: string | null };
type CO = { id: number; companyName?: string | null };
type BR = { id: number; branchName?: string | null };

// ---- Config your API base here ----
const API = {
  salaryCycle: "http://localhost:8000/salary-cycle",
  serviceProviders: "http://localhost:8000/service-provider",
  companies: "http://localhost:8000/company",
  branches: "http://localhost:8000/branches",
};

const MIN_CHARS = 1;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function MonthlySalaryCycleManagement() {
  const [cycles, setCycles] = useState<MonthlySalaryCycle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<MonthlySalaryCycle | null>(null);

  // ---- Form state (IDs + autocomplete strings) ----
  const [formData, setFormData] = useState({
    serviceProviderID: null as number | null,
    companyID: null as number | null,
    branchesID: null as number | null,
    spAutocomplete: "",
    coAutocomplete: "",
    brAutocomplete: "",
    cycleName: "",
    startDayOfMonth: 1,
  });

  // ---- Autocomplete lists/flags & refs for click-outside ----
  const [spList, setSpList] = useState<SP[]>([]);
  const [coList, setCoList] = useState<CO[]>([]);
  const [brList, setBrList] = useState<BR[]>([]);
  const [spLoading, setSpLoading] = useState(false);
  const [coLoading, setCoLoading] = useState(false);
  const [brLoading, setBrLoading] = useState(false);

  const spRef = useRef<HTMLDivElement | null>(null);
  const coRef = useRef<HTMLDivElement | null>(null);
  const brRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (spRef.current && !spRef.current.contains(t)) setSpList([]);
      if (coRef.current && !coRef.current.contains(t)) setCoList([]);
      if (brRef.current && !brRef.current.contains(t)) setBrList([]);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ---- Load initial list ----
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API.salaryCycle);
        const data: ApiSalaryCycle[] = await res.json();
        setCycles(data.map(mapApiToUi));
      } catch (e) {
        console.error("Failed to load salary cycles", e);
      }
    })();
  }, []);

  // ---- Helpers ----
  function mapApiToUi(x: ApiSalaryCycle): MonthlySalaryCycle {
    return {
      id: String(x.id),
      serviceProvider: x.serviceProvider?.companyName ?? "-",
      companyName: x.company?.companyName ?? "-",
      branchName: x.branches?.branchName ?? "-",
      cycleName: x.salaryCycleName ?? "-",
      startDayOfMonth: parseInt(x.monthStartDay ?? "1", 10),
      createdAt: x.createdAt ? x.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
    };
  }

  async function robustGet(url: string, q?: string) {
    // Try with ?q first; if it fails, retry plain GET
    try {
      const res = await fetch(q ? `${url}?q=${encodeURIComponent(q)}` : url);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    } catch {
      const res2 = await fetch(url);
      if (!res2.ok) throw new Error(String(res2.status));
      return res2.json();
    }
  }

  // ---- Autocomplete fetchers (debounced by 250ms) ----
  const runFetchSP = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setSpList([]);
    setSpLoading(true);
    try {
      const list: SP[] = await robustGet(API.serviceProviders, val);
      const filtered = list.filter(x =>
        (x.companyName ?? "").toLowerCase().includes(val.toLowerCase())
      );
      setSpList(filtered.slice(0, 50));
    } catch (e) {
      console.error("SP fetch error", e);
      setSpList([]);
    } finally {
      setSpLoading(false);
    }
  }, 250);

  const runFetchCO = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setCoList([]);
    setCoLoading(true);
    try {
      const list: CO[] = await robustGet(API.companies, val);
      const filtered = list.filter(x =>
        (x.companyName ?? "").toLowerCase().includes(val.toLowerCase())
      );
      setCoList(filtered.slice(0, 50));
    } catch (e) {
      console.error("CO fetch error", e);
      setCoList([]);
    } finally {
      setCoLoading(false);
    }
  }, 250);

  const runFetchBR = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setBrList([]);
    setBrLoading(true);
    try {
      const list: BR[] = await robustGet(API.branches, val);
      const filtered = list.filter(x =>
        (x.branchName ?? "").toLowerCase().includes(val.toLowerCase())
      );
      setBrList(filtered.slice(0, 50));
    } catch (e) {
      console.error("BR fetch error", e);
      setBrList([]);
    } finally {
      setBrLoading(false);
    }
  }, 250);

  // ---- CRUD handlers ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      serviceProviderID: formData.serviceProviderID,
      companyID: formData.companyID,
      branchesID: formData.branchesID,
      salaryCycleName: formData.cycleName,
      monthStartDay: pad2(formData.startDayOfMonth),
    };

    try {
      if (editingCycle) {
        const res = await fetch(`${API.salaryCycle}/${editingCycle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated: ApiSalaryCycle = await res.json();
        setCycles(prev =>
          prev.map(c => (c.id === String(updated.id) ? mapApiToUi(updated) : c))
        );
      } else {
        const res = await fetch(API.salaryCycle, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created: ApiSalaryCycle = await res.json();
        setCycles(prev => [mapApiToUi(created), ...prev]);
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleEdit = (cycle: MonthlySalaryCycle) => {
    setFormData(p => ({
      ...p,
      // When editing, we only have display strings. User will re-pick if needed.
      serviceProviderID: null,
      companyID: null,
      branchesID: null,
      spAutocomplete: cycle.serviceProvider || "",
      coAutocomplete: cycle.companyName || "",
      brAutocomplete: cycle.branchName || "",
      cycleName: cycle.cycleName,
      startDayOfMonth: cycle.startDayOfMonth || 1,
    }));
    setEditingCycle(cycle);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API.salaryCycle}/${id}`, { method: "DELETE" });
      setCycles(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceProviderID: null,
      companyID: null,
      branchesID: null,
      spAutocomplete: "",
      coAutocomplete: "",
      brAutocomplete: "",
      cycleName: "",
      startDayOfMonth: 1,
    });
    setEditingCycle(null);
    setSpList([]);
    setCoList([]);
    setBrList([]);
  };

  const filteredCycles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return cycles.filter(cycle =>
      cycle.cycleName.toLowerCase().includes(q) ||
      cycle.serviceProvider.toLowerCase().includes(q) ||
      cycle.companyName.toLowerCase().includes(q) ||
      cycle.branchName.toLowerCase().includes(q)
    );
  }, [cycles, searchTerm]);

  // Generate day options for dropdown
  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Monthly Salary Cycle</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage monthly salary cycle configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-sm px-3 py-2">
              <Plus className="w-4 h-4 mr-1" />
              Add Salary Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCycle ? "Edit Monthly Salary Cycle" : "Add New Monthly Salary Cycle"}
              </DialogTitle>
              <DialogDescription>
                {editingCycle
                  ? "Update the monthly salary cycle information below."
                  : "Fill in the details to add a new monthly salary cycle."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-3 gap-4">
                {/* Service Provider (Autocomplete) */}
                <div ref={spRef} className="space-y-2 relative">
                  <Label>Service Provider *</Label>
                  <Input
                    value={formData.spAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, spAutocomplete: val, serviceProviderID: null }));
                      runFetchSP(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchSP(val);
                    }}
                    placeholder="Start typing service provider…"
                    autoComplete="off"
                    required
                  />
                  {spList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {spLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {spList.map((sp) => (
                        <div
                          key={sp.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              serviceProviderID: sp.id,
                              spAutocomplete: sp.companyName ?? "",
                            }));
                            setSpList([]);
                          }}
                        >
                          {sp.companyName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Company (Autocomplete) */}
                <div ref={coRef} className="space-y-2 relative">
                  <Label>Company *</Label>
                  <Input
                    value={formData.coAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, coAutocomplete: val, companyID: null }));
                      runFetchCO(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchCO(val);
                    }}
                    placeholder="Start typing company…"
                    autoComplete="off"
                    required
                  />
                  {coList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {coLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {coList.map((co) => (
                        <div
                          key={co.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              companyID: co.id,
                              coAutocomplete: co.companyName ?? "",
                            }));
                            setCoList([]);
                          }}
                        >
                          {co.companyName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branch (Autocomplete) */}
                <div ref={brRef} className="space-y-2 relative">
                  <Label>Branch *</Label>
                  <Input
                    value={formData.brAutocomplete}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, brAutocomplete: val, branchesID: null }));
                      runFetchBR(val);
                    }}
                    onFocus={(e) => {
                      const val = e.target.value;
                      if (val.length >= MIN_CHARS) runFetchBR(val);
                    }}
                    placeholder="Start typing branch…"
                    autoComplete="off"
                    required
                  />
                  {brList.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full shadow max-h-48 overflow-y-auto">
                      {brLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>}
                      {brList.map((br) => (
                        <div
                          key={br.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              branchesID: br.id,
                              brAutocomplete: br.branchName ?? "",
                            }));
                            setBrList([]);
                          }}
                        >
                          {br.branchName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycleName">Cycle Name *</Label>
                <Input
                  id="cycleName"
                  value={formData.cycleName}
                  onChange={(e) => setFormData(prev => ({ ...prev, cycleName: e.target.value }))}
                  placeholder="Enter cycle name"
                  required
                />
              </div>

              {/* Start Day Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Cycle Configuration</h3>
                <div className="space-y-2">
                  <Label htmlFor="startDayOfMonth">Start Day of Month *</Label>
                  <select
                    id="startDayOfMonth"
                    value={formData.startDayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDayOfMonth: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {dayOptions.map(day => (
                      <option key={day} value={day}>
                        Day {day}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500">
                    Select the day of the month when the salary cycle starts
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingCycle ? "Update Salary Cycle" : "Add Salary Cycle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search salary cycles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 flex-shrink-0">
              {filteredCycles.length} cycles
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Salary Cycle Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:cash-multiple" className="w-5 h-5" />
            Monthly Salary Cycle List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 w-full">
          <div className="overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Service Provider</TableHead>
                  <TableHead className="w-[120px]">Company Name</TableHead>
                  <TableHead className="w-[120px]">Branch Name</TableHead>
                  <TableHead className="w-[150px]">Cycle Name</TableHead>
                  <TableHead className="w-[120px]">Start Day</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="mdi:cash-multiple" className="w-12 h-12 text-gray-300" />
                        <p>No salary cycles found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="whitespace-nowrap">{cycle.serviceProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{cycle.companyName}</TableCell>
                      <TableCell className="whitespace-nowrap">{cycle.branchName}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{cycle.cycleName}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        <Badge variant="outline">Day {cycle.startDayOfMonth}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{cycle.createdAt}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cycle)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cycle.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** simple debounce */
function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
