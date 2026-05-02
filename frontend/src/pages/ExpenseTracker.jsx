import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Trash2, PieChart, TrendingUp } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Education');
  const [loading, setLoading] = useState(false);
  const { requireAuth } = useContext(AuthContext);

  const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#3b82f6', '#f59e0b'];
  const CATEGORIES = ["Education", "Food", "Entertainment", "Transport", "Other"];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error('Failed to load expenses');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    requireAuth(async () => {
        setLoading(true);
        try {
          const res = await api.post('/expenses', { amount, description, category });
          setExpenses([res.data, ...expenses]);
          setAmount('');
          setDescription('');
        } catch (err) {
          alert("Failed to add expense.");
        } finally {
          setLoading(false);
        }
    });
  };

  const handleDelete = async (id) => {
    requireAuth(async () => {
        try {
          await api.delete(`/expenses/${id}`);
          setExpenses(expenses.filter(e => e._id !== id));
        } catch (err) {
          alert("Failed to delete expense.");
        }
    });
  };

  // Calculate stats
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const categoryData = CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
  })).filter(data => data.value > 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 glass rounded-xl text-secondary">
          <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Expense Tracker</h2>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage your educational budget and spending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <ScrollReveal 
          delay={0.1}
          className="lg:col-span-1 glass-card-hover self-start p-4 sm:p-5"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-secondary" /> Add Expense
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
             <div>
              <label className="block text-sm text-gray-400 mb-1">Amount ($)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="0.01" step="0.01"
                placeholder="0.00"
                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-secondary/50 transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. React Course Subscription"
                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-secondary/50 transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-secondary/50 transition-colors cursor-pointer outline-none appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-surface text-white">{cat}</option>
                ))}
              </select>
            </div>
            
            <PremiumButton className="w-full">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-medium rounded-xl py-3 mt-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                Add Record
              </button>
            </PremiumButton>
          </form>
        </ScrollReveal>

        {/* Analytics & List */}
        <ScrollReveal 
          delay={0.2}
          className="lg:col-span-2 space-y-6"
        >
          {/* Top Stat Cards */}
          <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card-hover flex items-center gap-4 py-4 px-4 sm:px-5">
              <div className="p-3 bg-secondary/20 rounded-xl text-secondary">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Spent</p>
                <p className="text-xl sm:text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
            <div className="glass-card-hover flex items-center gap-4 py-4 px-4 sm:px-5">
               <div className="p-3 bg-primary/20 rounded-xl text-primary">
                <PieChart size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Top Category</p>
                <p className="text-base sm:text-lg font-bold truncate">
                  {categoryData.length > 0 ? [...categoryData].sort((a,b) => b.value - a.value)[0].name : 'N/A'}
                </p>
              </div>
            </div>
          </ScrollRevealGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-[400px]">
            {/* Chart */}
             <div className="glass-card-hover flex flex-col items-center justify-center h-[300px] md:h-full p-4 sm:p-5">
               <h3 className="text-lg font-semibold w-full text-left mb-2 text-gray-300">Spending by Category</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm mt-10">No data to display chart</p>
              )}
            </div>

            {/* List */}
             <div className="glass-card-hover flex flex-col overflow-hidden h-[400px] md:h-full p-4 sm:p-5">
               <h3 className="text-lg font-semibold w-full text-left mb-4 text-gray-300">Recent Transactions</h3>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                 {expenses.length === 0 ? (
                   <p className="text-sm text-gray-500">No expenses recorded yet.</p>
                 ) : (
                    expenses.map(exp => (
                      <div key={exp._id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:border-white/20 transition-colors">
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm text-white truncate">{exp.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded bg-surface border border-white/10 text-gray-300">{exp.category}</span>
                            <span className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                           <span className="font-bold text-secondary">${exp.amount.toFixed(2)}</span>
                           <button onClick={() => handleDelete(exp._id)} className="text-gray-500 hover:text-accent transition-colors p-1.5 sm:p-1">
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    ))
                 )}
               </div>
             </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};
export default ExpenseTracker;
