'use client';

import React, { useState, useMemo } from 'react';
import { Ticket, User, Branch, Team } from '@/types';
import { Button } from './Button';
import { Input } from './Input';
import { CustomSelect } from './CustomSelect';
import { Modal } from './Modal';
import { LayoutGrid, BarChart3, Calendar, User as UserIcon, AlertCircle, FileText, Download, Table, FileSpreadsheet, File as FileIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';

interface ReportsSectionProps {
  tickets: Ticket[];
  requests?: any[];
  users?: User[];
  branches?: Branch[];
  teams?: Team[];
  currentUser?: User | null;
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({ tickets, requests = [], users, branches = [], teams = [], currentUser }) => {
  const [reportView, setReportView] = useState<'board' | 'list'>('board');
  
  // Download Modal State
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedReportForDownload, setSelectedReportForDownload] = useState<{name: string, format: 'csv' | 'pdf'} | null>(null);
  const [downloadFilters, setDownloadFilters] = useState({
    branchId: 'ALL',
    teamId: 'ALL',
    userId: 'ALL',
    startDate: '',
    endDate: ''
  });

  // Analytics Logic for Tickets (needed for report counts)
  const stats = useMemo(() => {
    const total = tickets.length;
    const closed = tickets.filter(t => t.status === 'CLOSED').length;
    const open = tickets.filter(t => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length;
    return { total, closed, open };
  }, [tickets]);

  // Analytics Logic for Requests (needed for report counts)
  const requestStats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(r => r.status === 'COMPLETED').length;
    const pending = requests.filter(r => ['PENDING', 'IN_PROGRESS'].includes(r.status)).length;
    return { total, completed, pending };
  }, [requests]);

  const handleDownload = (reportName: string, format: 'csv' | 'pdf') => {
    setSelectedReportForDownload({ name: reportName, format });
    setDownloadModalOpen(true);
  };

  const processDownload = () => {
    if (!selectedReportForDownload) return;
    
    const { name: reportName, format } = selectedReportForDownload;
    const { branchId, teamId, userId, startDate, endDate } = downloadFilters;

    // Filter Logic
    let filteredDownloadTickets = [...tickets];
    let filteredDownloadRequests = [...requests];
    let filteredDownloadUsers = users ? [...users] : [];

    // Apply Filters
    if (branchId !== 'ALL') {
      filteredDownloadTickets = filteredDownloadTickets.filter(t => t.branchId === branchId);
    }
    if (teamId !== 'ALL') {
      filteredDownloadTickets = filteredDownloadTickets.filter(t => t.teamId === teamId);
      filteredDownloadUsers = filteredDownloadUsers.filter(u => u.teamId === teamId);
    }
    if (userId !== 'ALL') {
       filteredDownloadTickets = filteredDownloadTickets.filter(t => t.userId === userId || t.assignedToUserId === userId);
       filteredDownloadRequests = filteredDownloadRequests.filter(r => r.userId === userId);
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filteredDownloadTickets = filteredDownloadTickets.filter(t => {
        const d = new Date(t.createdAt);
        return d >= start && d <= end;
      });
      filteredDownloadRequests = filteredDownloadRequests.filter(r => {
        const d = new Date(r.createdAt);
        return d >= start && d <= end;
      });
    }

    let data: any[] = [];
    let headers: string[] = [];
    let title = reportName;

    // Prepare data based on report type
    switch (reportName) {
      case 'All Tickets Report':
        headers = ['ID', 'Title', 'Status', 'Priority', 'Created At', 'Assignee', 'Branch', 'Team'];
        data = filteredDownloadTickets.map(t => ({
          ID: t.incNumber || t.id,
          Title: t.issue,
          Status: t.status,
          Priority: t.priority,
          'Created At': formatDate(t.createdAt),
          Assignee: t.assignedTo?.username || 'Unassigned',
          Branch: t.branch?.name || 'N/A',
          Team: t.team?.name || 'N/A'
        }));
        break;
      case 'Requests Summary':
        headers = ['ID', 'Type', 'Status', 'Created At', 'Requester'];
        data = filteredDownloadRequests.map(r => ({
          ID: r.id,
          Type: r.type,
          Status: r.status,
          'Created At': formatDate(r.createdAt),
          Requester: r.user?.username || 'Unknown'
        }));
        break;
      case 'User Activity Log':
        headers = ['Name', 'Email', 'Role', 'Status', 'Team', 'Last Active'];
        data = filteredDownloadUsers.map(u => ({
          Name: u.username,
          Email: u.email,
          Role: u.role,
          Status: (u as any).isActive ? 'Active' : 'Inactive',
          Team: u.team?.name || 'N/A',
          'Last Active': formatDate(new Date().toISOString()) // Placeholder
        }));
        break;
      case 'Pending Items':
        headers = ['Type', 'ID', 'Title', 'Status', 'Priority/Urgency', 'Created At'];
        const pendingTickets = filteredDownloadTickets.filter(t => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status));
        const pendingRequests = filteredDownloadRequests.filter(r => ['PENDING', 'IN_PROGRESS'].includes(r.status));
        
        data = [
          ...pendingTickets.map(t => ({
            Type: 'Ticket',
            ID: t.incNumber || t.id,
            Title: t.issue,
            Status: t.status,
            'Priority/Urgency': t.priority,
            'Created At': formatDate(t.createdAt)
          })),
          ...pendingRequests.map(r => ({
            Type: 'Request',
            ID: r.id,
            Title: r.type,
            Status: r.status,
            'Priority/Urgency': '-',
            'Created At': formatDate(r.createdAt)
          }))
        ];
        break;
      default:
        // For other reports, we'll just export basic stats for now
        headers = ['Metric', 'Value'];
        data = [
          { Metric: 'Total Tickets', Value: filteredDownloadTickets.length },
          { Metric: 'Open Tickets', Value: filteredDownloadTickets.filter(t => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length },
          { Metric: 'Closed Tickets', Value: filteredDownloadTickets.filter(t => t.status === 'CLOSED').length },
          { Metric: 'Total Requests', Value: filteredDownloadRequests.length },
          { Metric: 'Pending Requests', Value: filteredDownloadRequests.filter(r => ['PENDING', 'IN_PROGRESS'].includes(r.status)).length }
        ];
        break;
    }

    if (format === 'csv') {
      // Enhanced Excel/CSV Generation
      const wb = XLSX.utils.book_new();
      
      // Create header rows
      const titleRow = [['Valley National Bank - ' + title]];
      const metaRow = [['Generated: ' + new Date().toLocaleString()]];
      const filterRow = [[`Filters: Branch=${downloadFilters.branchId}, Team=${downloadFilters.teamId}, User=${downloadFilters.userId}`]];
      const emptyRow = [['']];
      
      // Convert data to array of arrays for sheet_add_aoa
      const headerRow = [headers];
      const dataRows = data.map(obj => headers.map(h => obj[h]));
      
      const ws = XLSX.utils.aoa_to_sheet([
        ...titleRow,
        ...metaRow,
        ...filterRow,
        ...emptyRow,
        ...headerRow,
        ...dataRows
      ]);

      // Set column widths (basic estimation)
      const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      // PDF Generation with Valley National Bank Template
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; max-width: 1000px; margin: 0 auto; }
            .header { border-bottom: 3px solid #005596; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; items-end; }
            .logo-text { color: #005596; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
            .sub-text { color: #64748b; margin: 5px 0 0 0; font-size: 14px; font-weight: 500; }
            .meta { text-align: right; }
            .report-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
            .report-date { color: #64748b; font-size: 13px; margin-top: 4px; }
            .filters { background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 12px; color: #64748b; margin-bottom: 20px; border: 1px solid #e2e8f0; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background-color: #f1f5f9; padding: 12px 16px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tr:hover { background-color: #f1f5f9; }
            
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
            .confidential { color: #ef4444; font-weight: 600; margin-bottom: 4px; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              table { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="logo-text">Valley National Bank</h1>
              <p class="sub-text">IT Service Management System</p>
            </div>
            <div class="meta">
              <p class="report-title">${title}</p>
              <p class="report-date">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div class="filters">
            <strong>Filters Applied:</strong> 
            Branch: ${downloadFilters.branchId === 'ALL' ? 'All' : branches.find(b => b.id === downloadFilters.branchId)?.name || downloadFilters.branchId} | 
            Team: ${downloadFilters.teamId === 'ALL' ? 'All' : teams.find(t => t.id === downloadFilters.teamId)?.name || downloadFilters.teamId} | 
            Date Range: ${downloadFilters.startDate && downloadFilters.endDate ? `${downloadFilters.startDate} to ${downloadFilters.endDate}` : 'All Time'}
          </div>

          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(h => `<td>${row[h] !== undefined && row[h] !== null ? row[h] : '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p class="confidential">CONFIDENTIAL - INTERNAL USE ONLY</p>
            <p>This report contains sensitive information intended only for authorized Valley National Bank personnel.</p>
            <p>&copy; ${new Date().getFullYear()} Valley National Bank. All rights reserved.</p>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 500); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
    
    setDownloadModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports Center</h2>
          <p className="text-slate-500 text-sm mt-1">Generate and download detailed reports for your organization</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setReportView('board')}
            className={`p-2 rounded-md transition-all ${
              reportView === 'board' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Board View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setReportView('list')}
            className={`p-2 rounded-md transition-all ${
              reportView === 'list' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="List View"
          >
            <Table className="w-5 h-5" />
          </button>
        </div>
      </div>

      {reportView === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[
            {
              title: 'All Tickets Report',
              description: 'Comprehensive list of all tickets including status, priority, and resolution details.',
              icon: FileText,
              color: 'bg-blue-50 text-blue-600',
              count: stats.total
            },
            {
              title: 'Requests Summary',
              description: 'Detailed breakdown of all service requests, approvals, and completion status.',
              icon: FileSpreadsheet,
              color: 'bg-purple-50 text-purple-600',
              count: requestStats.total
            },
            {
              title: 'User Activity Log',
              description: 'Track user interactions, ticket creations, and system usage over time.',
              icon: UserIcon,
              color: 'bg-orange-50 text-orange-600',
              count: users?.length || 0
            },
            {
              title: 'Pending Items',
              description: 'Report of all currently open tickets and pending requests requiring attention.',
              icon: AlertCircle,
              color: 'bg-red-50 text-red-600',
              count: stats.open + requestStats.pending
            },
            {
              title: 'Performance Metrics',
              description: 'Analysis of resolution times, SLA compliance, and team performance stats.',
              icon: BarChart3,
              color: 'bg-green-50 text-green-600',
              count: null
            },
            {
              title: 'Monthly Archive',
              description: 'Complete data archive for the current month including all closed items.',
              icon: Calendar,
              color: 'bg-slate-50 text-slate-600',
              count: null
            }
          ].map((report, index) => (
            <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${report.color}`}>
                  <report.icon className="w-6 h-6" />
                </div>
                {report.count !== null && (
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                    {report.count} Records
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {report.title}
              </h3>
              <p className="text-slate-500 text-sm mb-6 min-h-10">
                {report.description}
              </p>
              
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleDownload(report.title, 'csv')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  CSV
                </button>
                <button 
                  onClick={() => handleDownload(report.title, 'pdf')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <FileIcon className="w-4 h-4 text-red-600" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Report Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Description</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Records</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: 'All Tickets Report', desc: 'Full ticket history export', count: stats.total, icon: FileText },
                  { name: 'Requests Summary', desc: 'Service request status log', count: requestStats.total, icon: FileSpreadsheet },
                  { name: 'User Activity Log', desc: 'User system interaction log', count: users?.length || 0, icon: UserIcon },
                  { name: 'Pending Items', desc: 'Open tickets and pending requests', count: stats.open + requestStats.pending, icon: AlertCircle },
                  { name: 'Performance Metrics', desc: 'SLA and resolution time analysis', count: '-', icon: BarChart3 },
                  { name: 'Monthly Archive', desc: 'Current month data backup', count: '-', icon: Calendar },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                          <row.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{row.desc}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDownload(row.name, 'csv')}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                          title="Download CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownload(row.name, 'pdf')}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Download PDF"
                        >
                          <FileIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download Modal */}
      <Modal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title={`Download ${selectedReportForDownload?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Report Configuration</h4>
              <p className="text-sm text-blue-700 mt-1">
                Configure filters to customize your report. By default, all data is included.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelect
              label="Branch"
              value={downloadFilters.branchId}
              onChange={(val) => setDownloadFilters(prev => ({ ...prev, branchId: val }))}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
            />
            <CustomSelect
              label="Team"
              value={downloadFilters.teamId}
              onChange={(val) => setDownloadFilters(prev => ({ ...prev, teamId: val }))}
              options={[
                { value: 'ALL', label: 'All Teams' },
                ...teams.map(t => ({ value: t.id, label: t.name }))
              ]}
            />
            <CustomSelect
              label="User"
              value={downloadFilters.userId}
              onChange={(val) => setDownloadFilters(prev => ({ ...prev, userId: val }))}
              options={[
                { value: 'ALL', label: 'All Users' },
                ...(users || []).map(u => ({ value: u.id, label: u.username }))
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Start Date"
                type="date"
                value={downloadFilters.startDate}
                onChange={(e) => setDownloadFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <Input
                label="End Date"
                type="date"
                value={downloadFilters.endDate}
                onChange={(e) => setDownloadFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDownloadModalOpen(false)}>Cancel</Button>
            <Button onClick={processDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download {selectedReportForDownload?.format.toUpperCase()}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
