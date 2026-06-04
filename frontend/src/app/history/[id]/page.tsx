
interface PageProps {
    params: Promise<{
        id: string;
    }>
}

export default async function PredictionPage ({ params }: PageProps ) {

    const resolvedParams = await params
    const res = await fetch(`http://localhost:8000/api/history/${resolvedParams.id}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        return (
            <div className="min-h-screen p-8 text-white">
                <h1 className="text-2xl">Prediction not found</h1>
            </div>
        );
    }

    const prediction = await res.json();

    return (
    <div className="min-h-screen p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">Prediction #{prediction.id}</h1>
      
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
        <p className="text-xl mb-2">{prediction.prediction_text}</p>
        <p className="text-gray-400">Probability: {prediction.probability}%</p>
        
        {/* Placeholder for future Brier Score / Trend Graph */}
        <div className="mt-8 p-8 border border-dashed border-white/20 rounded-xl flex items-center justify-center text-gray-500">
          Future Trend Graph & Updates will go here
        </div>
      </div>
    </div>
  );
};