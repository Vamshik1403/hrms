"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Icon } from "@iconify/react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

/* ---------- Types ---------- */
interface Allowance {
  id: string;
  name: string;
  type: "Fixed" | "Percentage";
  value: number;
}
interface Deduction {
  id: string;
  name: string;
  type: "Fixed" | "Percentage";
  value: number;
}

type ApiAllowance = {
  id: number;
  salaryAllowanceName: string | null;
  salaryAllowanceType: string | null;
  salaryAllowanceValue: string | null;
};
type ApiDeduction = {
  id: number;
  salaryDeductionName: string | null;
  salaryDeductionType: string | null;
  salaryDeductionValue: string | null;
};
type ApiMPG = {
  id: number;
  serviceProviderID: number | null;
  companyID: number | null;
  branchesID: number | null;
  monthlyPayGradeName: string | null;
  salType?: string | null;
  grossSalary: string | null;
  percentageOfBasic: string | null;
  basicSalary: number | null;
  serviceProvider?: { id: number; companyName?: string | null } | null;
  company?: { id: number; companyName?: string | null } | null;
  branches?: { id: number; branchName?: string | null } | null;
  monthlyPayGradeAllowanceList: { salaryAllowance?: ApiAllowance | null }[];
  monthlyPayGradeDeductionList: { salaryDeduction?: ApiDeduction | null }[];
  createdAt?: string;
};

interface MonthlyPayGradeUI {
  id: string;
  serviceProviderID: number | null;
  companyID: number | null;
  branchesID: number | null;
  serviceProvider: string;
  companyName: string;
  branchName: string;
  monthlyPayGradeName: string;
  grossSalary: number;
  salType: "Percentage" | "Fixed" | "-";
  percentageOfBasic: number;
  basicSalary: number;
  selectedAllowances: Allowance[];
  selectedDeductions: Deduction[];
  createdAt: string;
}

type SP = { id: number; companyName?: string | null };
type CO = { id: number; companyName?: string | null };
type BR = { id: number; branchName?: string | null };

/* ---------- API endpoints ---------- */
const API = {
  mpg: "http://localhost:8000/monthly-pay-grade",
  allowances: "http://localhost:8000/salary-allowance",
  deductions: "http://localhost:8000/salary-deduction",
  serviceProviders: "http://localhost:8000/service-provider",
  companies: "http://localhost:8000/company",
  branches: "http://localhost:8000/branches",
};

const MIN_CHARS = 1;
const EPS = 0.5; // ₹0.50 tolerance for equality checks

/* ---------- Component ---------- */
export function MonthlyPayGradeManagement() {
  const [payGrades, setPayGrades] = useState<MonthlyPayGradeUI[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayGrade, setEditingPayGrade] = useState<MonthlyPayGradeUI | null>(null);

  // fetched picklists
  const [allowanceList, setAllowanceList] = useState<Allowance[]>([]);
  const [deductionList, setDeductionList] = useState<Deduction[]>([]);

  // --- FK autocomplete state ---
  const [spList, setSpList] = useState<SP[]>([]);
  const [coList, setCoList] = useState<CO[]>([]);
  const [brList, setBrList] = useState<BR[]>([]);
  const [spLoading, setSpLoading] = useState(false);
  const [coLoading, setCoLoading] = useState(false);
  const [brLoading, setBrLoading] = useState(false);
  const spRef = useRef<HTMLDivElement | null>(null);
  const coRef = useRef<HTMLDivElement | null>(null);
  const brRef = useRef<HTMLDivElement | null>(null);

  // form data (IDs + display strings)
  const [formData, setFormData] = useState({
    serviceProviderID: null as number | null,
    companyID: null as number | null,
    branchesID: null as number | null,
    spAutocomplete: "",
    coAutocomplete: "",
    brAutocomplete: "",
    monthlyPayGradeName: "",
    salType: "Percentage" as "Percentage" | "Fixed",
    grossSalary: 0,
    percentageOfBasic: 0,
    basicSalary: 0,
    selectedAllowances: [] as Allowance[],
    selectedDeductions: [] as Deduction[],
  });

  /* ---------- Click outside to close suggestion boxes ---------- */
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

  /* ---------- Initial load ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [aRes, dRes, mpgRes] = await Promise.all([fetch(API.allowances), fetch(API.deductions), fetch(API.mpg)]);
        const [aData, dData, mpgData]: [ApiAllowance[], ApiDeduction[], ApiMPG[]] = await Promise.all([
          aRes.json(),
          dRes.json(),
          mpgRes.json(),
        ]);

        setAllowanceList(
          aData.map((x) => ({
            id: String(x.id),
            name: x.salaryAllowanceName ?? "-",
            type: (x.salaryAllowanceType === "Percentage" ? "Percentage" : "Fixed") as "Fixed" | "Percentage",
            value: parseFloat(x.salaryAllowanceValue ?? "0") || 0,
          }))
        );

        setDeductionList(
          dData.map((x) => ({
            id: String(x.id),
            name: x.salaryDeductionName ?? "-",
            type: (x.salaryDeductionType === "Percentage" ? "Percentage" : "Fixed") as "Fixed" | "Percentage",
            value: parseFloat(x.salaryDeductionValue ?? "0") || 0,
          }))
        );

        setPayGrades(mpgData.map(mapApiToUi));
      } catch (e) {
        console.error("init load failed", e);
      }
    })();
  }, []);

  /* ---------- Derived calc ---------- */
  // Auto-calc basic only when Salary Type is "Percentage"
  useEffect(() => {
    if (formData.salType === "Percentage") {
      const basic = (formData.grossSalary * formData.percentageOfBasic) / 100;
      setFormData((p) => ({ ...p, basicSalary: Math.round(basic) || 0 }));
    }
  }, [formData.grossSalary, formData.percentageOfBasic, formData.salType]);

  /* ---------- Totals (live) ---------- */
  const allowanceTotal = useMemo(() => {
    // Allowance % is applied on BASIC
    return formData.selectedAllowances.reduce((sum, a) => {
      const add = a.type === "Percentage" ? (formData.basicSalary * a.value) / 100 : a.value;
      return sum + add;
    }, 0);
  }, [formData.selectedAllowances, formData.basicSalary]);

  const expectedGrossFromBasicPlusAllowances = useMemo(() => {
    return Math.round((formData.basicSalary + allowanceTotal) * 100) / 100;
  }, [formData.basicSalary, allowanceTotal]);

  const deductionTotal = useMemo(() => {
    // Deduction % is applied on GROSS (adjust to Basic if your policy needs)
    return formData.selectedDeductions.reduce((sum, d) => {
      const add = d.type === "Percentage" ? (formData.grossSalary * d.value) / 100 : d.value;
      return sum + add;
    }, 0);
  }, [formData.selectedDeductions, formData.grossSalary]);

  const netPayable = useMemo(() => {
    return Math.max(0, Math.round((formData.grossSalary - deductionTotal) * 100) / 100);
  }, [formData.grossSalary, deductionTotal]);

  const grossMatchesDerived = useMemo(() => {
    return Math.abs(formData.grossSalary - expectedGrossFromBasicPlusAllowances) <= EPS;
  }, [formData.grossSalary, expectedGrossFromBasicPlusAllowances]);

  /* ---------- Helpers ---------- */
  function safeParseNum(v: string | null | undefined, d = 0) {
    const n = parseFloat(v ?? "");
    return Number.isFinite(n) ? n : d;
  }

  function mapApiToUi(x: ApiMPG): MonthlyPayGradeUI {
    const allowances: Allowance[] = x.monthlyPayGradeAllowanceList
      .map((row) => row.salaryAllowance)
      .filter(Boolean)
      .map((a) => ({
        id: String(a!.id),
        name: a!.salaryAllowanceName ?? "-",
        type: (a!.salaryAllowanceType === "Percentage" ? "Percentage" : "Fixed") as "Fixed" | "Percentage",
        value: safeParseNum(a!.salaryAllowanceValue, 0),
      }));

    const deductions: Deduction[] = x.monthlyPayGradeDeductionList
      .map((row) => row.salaryDeduction)
      .filter(Boolean)
      .map((d) => ({
        id: String(d!.id),
        name: d!.salaryDeductionName ?? "-",
        type: (d!.salaryDeductionType === "Percentage" ? "Percentage" : "Fixed") as "Fixed" | "Percentage",
        value: safeParseNum(d!.salaryDeductionValue, 0),
      }));

    return {
      id: String(x.id),
      serviceProviderID: x.serviceProviderID ?? null,
      companyID: x.companyID ?? null,
      branchesID: x.branchesID ?? null,
      serviceProvider: x.serviceProvider?.companyName ?? "-",
      companyName: x.company?.companyName ?? "-",
      branchName: x.branches?.branchName ?? "-",
      monthlyPayGradeName: x.monthlyPayGradeName ?? "-",
      salType: (x.salType === "Fixed" || x.salType === "Percentage") ? x.salType : "-",
      grossSalary: safeParseNum(x.grossSalary, 0),
      percentageOfBasic: safeParseNum(x.percentageOfBasic, 0),
      basicSalary: x.basicSalary ?? 0,
      selectedAllowances: allowances,
      selectedDeductions: deductions,
      createdAt: x.createdAt ? x.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
    };
  }

  function mapUiToPayload(fd: typeof formData) {
    return {
      serviceProviderID: fd.serviceProviderID,
      companyID: fd.companyID,
      branchesID: fd.branchesID,
      monthlyPayGradeName: fd.monthlyPayGradeName,
      salType: fd.salType, // <-- keep posting Salary Type
      grossSalary: String(fd.grossSalary),
      percentageOfBasic: fd.salType === "Percentage" ? String(fd.percentageOfBasic) : "0",
      basicSalary: fd.basicSalary,
      allowanceIDs: fd.selectedAllowances.map((a) => Number(a.id)),
      deductionIDs: fd.selectedDeductions.map((d) => Number(d.id)),
    };
  }

  async function robustGet(url: string, q?: string) {
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

  /* ---------- Debounced FK fetchers ---------- */
  const runFetchSP = debounce(async (val: string) => {
    if (!val || val.length < MIN_CHARS) return setSpList([]);
    setSpLoading(true);
    try {
      const list: SP[] = await robustGet(API.serviceProviders, val);
      const filtered = list.filter((x) => (x.companyName ?? "").toLowerCase().includes(val.toLowerCase()));
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
      const filtered = list.filter((x) => (x.companyName ?? "").toLowerCase().includes(val.toLowerCase()));
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
      const filtered = list.filter((x) => (x.branchName ?? "").toLowerCase().includes(val.toLowerCase()));
      setBrList(filtered.slice(0, 50));
    } catch (e) {
      console.error("BR fetch error", e);
      setBrList([]);
    } finally {
      setBrLoading(false);
    }
  }, 250);

  /* ---------- CRUD ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation A: Gross must equal Basic + Selected Allowances
    const mismatch = Math.abs(formData.grossSalary - expectedGrossFromBasicPlusAllowances) > EPS;
    if (mismatch) {
      alert(
        `Gross Salary must equal Basic + Selected Allowances.\n\n` +
        `Gross Salary: ₹${formData.grossSalary.toFixed(2)}\n` +
        `Basic + Allowances: ₹${expectedGrossFromBasicPlusAllowances.toFixed(2)}`
      );
      return;
    }

    // Validation B: Total deductions must be > 0 (cannot be zero or negative)
    if (deductionTotal <= 0) {
      alert(`Total deductions must be greater than 0.`);
      return;
    }

    const payload = mapUiToPayload(formData);

    try {
      if (editingPayGrade) {
        const res = await fetch(`${API.mpg}/${editingPayGrade.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated: ApiMPG = await res.json();
        setPayGrades((prev) => prev.map((p) => (p.id === String(updated.id) ? mapApiToUi(updated) : p)));
      } else {
        const res = await fetch(API.mpg, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created: ApiMPG = await res.json();
        setPayGrades((prev) => [mapApiToUi(created), ...prev]);
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleEdit = (pg: MonthlyPayGradeUI) => {
    setFormData({
      serviceProviderID: pg.serviceProviderID,
      companyID: pg.companyID,
      branchesID: pg.branchesID,
      spAutocomplete: pg.serviceProvider || "",
      coAutocomplete: pg.companyName || "",
      brAutocomplete: pg.branchName || "",
      monthlyPayGradeName: pg.monthlyPayGradeName,
      salType: pg.salType === "Fixed" || pg.salType === "Percentage" ? pg.salType : "Percentage",
      grossSalary: pg.grossSalary,
      percentageOfBasic: pg.percentageOfBasic,
      basicSalary: pg.basicSalary,
      selectedAllowances: pg.selectedAllowances,
      selectedDeductions: pg.selectedDeductions,
    });
    setEditingPayGrade(pg);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API.mpg}/${id}`, { method: "DELETE" });
      setPayGrades((prev) => prev.filter((p) => p.id !== id));
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
      monthlyPayGradeName: "",
      salType: "Percentage",
      grossSalary: 0,
      percentageOfBasic: 0,
      basicSalary: 0,
      selectedAllowances: [],
      selectedDeductions: [],
    });
    setEditingPayGrade(null);
    setSpList([]); setCoList([]); setBrList([]);
  };

  const handleAllowanceToggle = (allowance: Allowance) => {
    const isSelected = formData.selectedAllowances.some((a) => a.id === allowance.id);
    setFormData((prev) => ({
      ...prev,
      selectedAllowances: isSelected
        ? prev.selectedAllowances.filter((a) => a.id !== allowance.id)
        : [...prev.selectedAllowances, allowance],
    }));
  };

  const handleDeductionToggle = (deduction: Deduction) => {
    const isSelected = formData.selectedDeductions.some((d) => d.id === deduction.id);
    setFormData((prev) => ({
      ...prev,
      selectedDeductions: isSelected
        ? prev.selectedDeductions.filter((d) => d.id !== deduction.id)
        : [...prev.selectedDeductions, deduction],
    }));
  };

  const filteredPayGrades = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return payGrades.filter(
      (pg) =>
        pg.monthlyPayGradeName.toLowerCase().includes(q) ||
        pg.serviceProvider.toLowerCase().includes(q) ||
        pg.companyName.toLowerCase().includes(q) ||
        pg.branchName.toLowerCase().includes(q),
    );
  }, [payGrades, searchTerm]);

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Monthly Pay Grade</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage monthly pay grades and salary structures</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-sm px-3 py-2">
              <Plus className="w-4 h-4 mr-1" />
              Add Monthly Pay Grade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPayGrade ? "Edit Monthly Pay Grade" : "Add New Monthly Pay Grade"}</DialogTitle>
              <DialogDescription>
                {editingPayGrade
                  ? "Update the monthly pay grade information below."
                  : "Fill in the details to add a new monthly pay grade."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* --- Basic Information with AUTOCOMPLETE --- */}
              <div className="grid grid-cols-3 gap-4">
                {/* Service Provider */}
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

                {/* Company */}
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

                {/* Branch */}
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

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="monthlyPayGradeName">Monthly Pay Grade Name *</Label>
                <Input
                  id="monthlyPayGradeName"
                  value={formData.monthlyPayGradeName}
                  onChange={(e) => setFormData((p) => ({ ...p, monthlyPayGradeName: e.target.value }))}
                  placeholder="Enter monthly pay grade name"
                  required
                />
              </div>

              {/* Salary Config (no derived displays here) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Salary Configuration</h3>

                {/* Salary Type */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salType">Salary Type *</Label>
                    <select
                      id="salType"
                      value={formData.salType}
                      onChange={(e) => {
                        const val = e.target.value === "Fixed" ? "Fixed" : "Percentage";
                        setFormData((p) => ({ ...p, salType: val }));
                      }}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="Percentage">Percentage</option>
                      <option value="Fixed">Fixed </option>
                    </select>
                   
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Gross Salary *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="grossSalary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.grossSalary}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, grossSalary: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="0"
                        required
                      />
                      <span className="text-sm text-gray-500">₹</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="percentageOfBasic">
                      % Of Basic {formData.salType === "Fixed" && "(disabled in Fixed)"}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="percentageOfBasic"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.percentageOfBasic}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, percentageOfBasic: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="0"
                        disabled={formData.salType === "Fixed"}
                        required={formData.salType === "Percentage"}
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">
                      Basic Salary {formData.salType === "Percentage" ? "(Calculated)" : "(Editable)"}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="basicSalary"
                        type="number"
                        step="0.01"
                        value={formData.basicSalary}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            basicSalary: parseFloat(e.target.value) || 0,
                          }))
                        }
                        readOnly={formData.salType === "Percentage"}
                        className={formData.salType === "Percentage" ? "bg-gray-100" : ""}
                      />
                      <span className="text-sm text-gray-500">₹</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.salType === "Percentage"
                        ? "Auto-calculated from Gross × % Of Basic"
                        : "Enter the Basic amount manually"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Allowance Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Allowance Selection</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-4">Select allowances for this pay grade:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allowanceList.map((allowance) => {
                      const isSelected = formData.selectedAllowances.some((a) => a.id === allowance.id);
                      return (
                        <div key={allowance.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded">
                          <input
                            type="checkbox"
                            id={`allowance-${allowance.id}`}
                            checked={isSelected}
                            onChange={() => handleAllowanceToggle(allowance)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`allowance-${allowance.id}`} className="font-medium cursor-pointer">
                              {allowance.name}
                            </Label>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>
                                {allowance.type === "Percentage"
                                  ? `${allowance.value}% of Basic`
                                  : `₹${allowance.value}`}
                              </span>
                              <Badge variant="outline" className="text-xs">{allowance.type}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Selected: {formData.selectedAllowances.length} allowance(s)
                    </p>
                    {/* LIVE derived gross shown here (moved from Salary Config) */}
                    <p className="text-sm">
                      Basic + Selected Allowances:{" "}
                      <span className="font-semibold">₹{expectedGrossFromBasicPlusAllowances.toFixed(2)}</span>
                      {!grossMatchesDerived && (
                        <span className="text-red-600 ml-2">← doesn’t match Gross</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deduction Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Deduction Selection</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-4">Select deductions for this pay grade:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {deductionList.map((deduction) => {
                      const isSelected = formData.selectedDeductions.some((d) => d.id === deduction.id);
                      return (
                        <div key={deduction.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded">
                          <input
                            type="checkbox"
                            id={`deduction-${deduction.id}`}
                            checked={isSelected}
                            onChange={() => handleDeductionToggle(deduction)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`deduction-${deduction.id}`} className="font-medium cursor-pointer">
                              {deduction.name}
                            </Label>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>
                                {deduction.type === "Percentage"
                                  ? `${deduction.value}% of Gross`
                                  : `₹${deduction.value}`}
                              </span>
                              <Badge variant="outline" className="text-xs">{deduction.type}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Selected: {formData.selectedDeductions.length} deduction(s)
                    </p>
                    {/* LIVE totals + net payable shown only here */}
                    <div className="text-sm space-x-4">
                      <span>
                        Total Deductions: <span className="font-semibold">₹{deductionTotal.toFixed(2)}</span>
                        {deductionTotal <= 0 && <span className="text-red-600 ml-2">← must be &gt; 0</span>}
                      </span>
                      <span>
                        Net Payable: <span className="font-semibold">₹{netPayable.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingPayGrade ? "Update Monthly Pay Grade" : "Add Monthly Pay Grade"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search monthly pay grades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 flex-shrink-0">
              {filteredPayGrades.length} pay grades
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:cash-multiple" className="w-5 h-5" />
            Monthly Pay Grade List
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
                  <TableHead className="w-[150px]">Pay Grade Name</TableHead>
                  <TableHead className="w-[100px]">Salary Type</TableHead>
                  <TableHead className="w-[100px]">Gross</TableHead>
                  <TableHead className="w-[100px]">Basic</TableHead>
                  <TableHead className="w-[100px]">Allowances</TableHead>
                  <TableHead className="w-[100px]">Deductions</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="mdi:cash-multiple" className="w-12 h-12 text-gray-300" />
                        <p>No monthly pay grades found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayGrades.map((pg) => (
                    <TableRow key={pg.id}>
                      <TableCell className="whitespace-nowrap">{pg.serviceProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{pg.companyName}</TableCell>
                      <TableCell className="whitespace-nowrap">{pg.branchName}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{pg.monthlyPayGradeName}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">{pg.salType}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">₹{pg.grossSalary}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">₹{pg.basicSalary}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        <Badge variant="secondary">{pg.selectedAllowances.length} allowances</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        <Badge variant="secondary">{pg.selectedDeductions.length} deductions</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{pg.createdAt}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(pg)} className="h-7 w-7 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pg.id)}
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

/* ---------- tiny debounce helper ---------- */
function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
