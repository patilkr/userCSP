PAPERNAME=paper
TEXFILES =  *.tex *.bib *.sty

$(PAPERNAME).pdf : $(TEXFILES) $(PAPERNAME).tex *.bib
	pdflatex $(PAPERNAME)
	bibtex $(PAPERNAME)
	pdflatex $(PAPERNAME)
	pdflatex $(PAPERNAME)
# 	dvips -K -P amz -P cmz -t letter -o $(PAPERNAME).ps \
# 	$(PAPERNAME)
# 	ps2pdf $(PAPERNAME).ps $(PAPERNAME).pdf
clean:
	rm -f *.ps $(PAPERNAME).pdf *.dvi *.aux *.log *.blg *.bbl *~ *.ilg *.idx *.out *.in
