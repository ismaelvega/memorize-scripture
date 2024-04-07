import { useSelector, useDispatch } from "react-redux";

export const VersesChunksContainer = () => {
    const dispatch = useDispatch();
    const verseContent = useSelector((state) => state.versePicker.verseContent);
    const versesChunks = useSelector((state) => state.versesChunks.versesChunks);

    return (
        <div className="my-4">
            <h2 className="text-red-300 font-bold">{`Versículo separado`}</h2>
            <div className="px-4">
                {
                    versesChunks.length > 0 && (
                        versesChunks.map((chunk, index) => {
                            return <p key={index}><span>{index+1}</span> - {chunk}</p>
                        })
                    )
                }
            </div>
        </div>
    )
}
