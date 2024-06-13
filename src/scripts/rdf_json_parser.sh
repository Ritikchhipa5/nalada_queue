cd /Users/z3t4z00k/Work/Nalnda/nalnda-books/data/epub

# TODO: create a loop for books
for folder in $(ls)
do
    echo "Wokring on $folder"
    cd $folder
    for i in *.rdf
    do
        fxparser "$i" > "${i%.*}.json"
    done
    echo "done\n\n"
    cd ".."
done

