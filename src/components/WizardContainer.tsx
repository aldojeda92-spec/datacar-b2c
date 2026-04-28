// Dentro de WizardContainer.tsx
const handleExecute = async () => {
  setIsAnalyzing(true);
  // Aseguramos que los nombres coincidan con lo que espera saveLeadAction
  const dataToSave = {
    ...formData,
    notas: formData.notas // Asegúrate de que tu estado use 'notas'
  };
  
  const result = await saveLeadAction(dataToSave);
  if (result.success) {
    const res = await fetch('/api/analyze', { 
      method: 'POST', 
      body: JSON.stringify({ leadId: result.leadId }) 
    });
    const data = await res.json();
    if (data.success) { 
      setTop10(data.top10); 
      setStep(2); 
    }
  }
  setIsAnalyzing(false);
};
